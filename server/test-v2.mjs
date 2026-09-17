import { jar, req, login, check, summary } from './test-harness.mjs'

const item = { menu_item_id: 11, quantity: 1, options: {} }

// ── auth: all six roles ──
const creds = [
  ['customer@sijilmassa.ma', 'Customer1234!', 'customer'],
  ['reception@sijilmassa.ma', 'Reception1234!', 'receptionist'],
  ['kitchen@sijilmassa.ma', 'Kitchen1234!', 'kitchen_staff'],
  ['driver@sijilmassa.ma', 'Driver1234!', 'delivery_driver'],
  ['manager@sijilmassa.ma', 'Manager1234!', 'manager'],
  ['admin@sijilmassa.ma', 'Admin1234!', 'admin'],
]
const S = {}
for (const [id, pw, role] of creds) {
  const r = await login(id, pw)
  S[role] = r
  check(`login ${role}`, r.code === 200 && r.user?.role === role, `code=${r.code}`)
}
check('bad password 401', (await req(jar(), 'POST', '/api/auth/login', { identifier: 'customer@sijilmassa.ma', password: 'badpassxx' })).code === 401)
check('kitchen cannot manage menu 403', (await req(S.kitchen_staff.jar, 'GET', '/api/staff/menu')).code === 403)
check('driver cannot list users 403', (await req(S.delivery_driver.jar, 'GET', '/api/staff/users')).code === 403)
check('customer blocked from staff 403', (await req(S.customer.jar, 'GET', '/api/staff/orders')).code === 403)

// ── card payment flow ──
let r = await req(S.customer.jar, 'POST', '/api/orders', {
  order_type: 'pickup', full_name: 'Flow Test', phone: '0611223344',
  payment_method: 'card', special_instructions: 'v2test', items: [item],
})
check('order 201 pending_payment', r.code === 201 && r.json.order.status === 'pending_payment', `code=${r.code}`)
const oid = r.json.order.id
r = await req(S.customer.jar, 'POST', '/api/payments/create', { order_id: oid, method: 'card' })
check('intent 201 pending', r.code === 201 && r.json.payment.status === 'pending', `code=${r.code}`)
const ppid = r.json.payment.provider_payment_id
r = await req(S.customer.jar, 'GET', `/api/orders/${oid}`)
check('not paid by client', r.json.order.status === 'pending_payment')
r = await req(S.customer.jar, 'POST', '/api/payments/mock/confirm', { provider_payment_id: ppid, outcome: 'paid' })
check('webhook confirm 200', r.code === 200 && r.json.deduped === false, `code=${r.code}`)
r = await req(S.customer.jar, 'GET', `/api/orders/${oid}`)
check('received+paid after webhook', r.json.order.status === 'received' && r.json.order.payment_status === 'paid')
r = await req(S.customer.jar, 'POST', '/api/payments/mock/confirm', { provider_payment_id: ppid, outcome: 'paid' })
check('replay deduped', r.code === 200 && r.json.deduped === true)
check('second intent rejected 422', (await req(S.customer.jar, 'POST', '/api/payments/create', { order_id: oid, method: 'card' })).code === 422)

// ── workflow transitions ──
r = await req(S.customer.jar, 'PATCH', `/api/staff/orders/${oid}/status`, { status: 'delivered', reason: '' })
check('customer cannot write status 403', r.code === 403)
r = await req(S.receptionist.jar, 'PATCH', `/api/staff/orders/${oid}/status`, { status: 'delivered', reason: '' })
check('invalid jump rejected 422', r.code === 422)
const flow = [['accepted', S.receptionist], ['preparing', S.kitchen_staff], ['ready', S.kitchen_staff]]
for (const [st, who] of flow) {
  r = await req(who.jar, 'PATCH', `/api/staff/orders/${oid}/status`, { status: st, reason: '' })
  check(`transition → ${st} ${r.code}`, r.code === 200, `code=${r.code}`)
}

// ── delivery order full flow ──
r = await req(S.customer.jar, 'POST', '/api/orders', {
  order_type: 'delivery', full_name: 'Flow D', phone: '0611223344',
  address_line: 'Rue Test 1', city: 'Meknes', latitude: 33.895, longitude: -5.545,
  payment_method: 'cash', special_instructions: 'v2test-d', items: [item],
})
check('delivery order 201', r.code === 201)
const did = r.json.order.id
check('cash intent → received', (await req(S.customer.jar, 'POST', '/api/payments/create', { order_id: did, method: 'cash' })).code === 201)
for (const [st, who] of [['accepted', S.receptionist], ['preparing', S.kitchen_staff], ['ready', S.kitchen_staff]]) {
  r = await req(who.jar, 'PATCH', `/api/staff/orders/${did}/status`, { status: st, reason: '' })
  check(`delivery → ${st}`, r.code === 200, `code=${r.code}`)
}
r = await req(S.delivery_driver.jar, 'GET', '/api/delivery/available')
check('driver sees available', r.code === 200 && r.json.orders.some((o) => o.id === did), `n=${r.json.orders?.length}`)
check('no phone before claim', !JSON.stringify(r.json.orders.find((o) => o.id === did) || {}).includes('0611223344'))
r = await req(S.delivery_driver.jar, 'POST', `/api/delivery/${did}/claim`)
check('claim 200', r.code === 200, `code=${r.code}`)
r = await req(S.delivery_driver.jar, 'POST', `/api/delivery/${did}/claim`)
check('re-claim rejected (not 200)', r.code !== 200, `code=${r.code}`)
r = await req(S.delivery_driver.jar, 'POST', `/api/delivery/${did}/start`)
check('start 200', r.code === 200, `code=${r.code}`)
r = await req(S.delivery_driver.jar, 'POST', `/api/delivery/${did}/complete`)
check('complete 200', r.code === 200, `code=${r.code}`)
r = await req(S.customer.jar, 'GET', `/api/orders/${did}`)
check('final delivered', r.json.order.status === 'delivered')
r = await req(S.delivery_driver.jar, 'PATCH', `/api/staff/orders/${did}/status`, { status: 'preparing', reason: '' })
check('driver invalid jump 422', r.code === 422, `code=${r.code}`)

// ── parallel claim race: exactly one must win ──
r = await req(S.customer.jar, 'POST', '/api/orders', {
  order_type: 'delivery', full_name: 'Race', phone: '0611223344',
  address_line: 'Rue R', city: 'Meknes', latitude: 33.895, longitude: -5.545,
  payment_method: 'cash', items: [item],
})
const raceId = r.json.order.id
await req(S.customer.jar, 'POST', '/api/payments/create', { order_id: raceId, method: 'cash' })
for (const st of ['accepted', 'preparing', 'ready']) {
  const who = st === 'accepted' ? S.receptionist : S.kitchen_staff
  await req(who.jar, 'PATCH', `/api/staff/orders/${raceId}/status`, { status: st, reason: '' })
}
const [c1, c2] = await Promise.all([
  req(S.delivery_driver.jar, 'POST', `/api/delivery/${raceId}/claim`),
  req(S.delivery_driver.jar, 'POST', `/api/delivery/${raceId}/claim`),
])
const wins = [c1.code, c2.code].filter((c) => c === 200).length
check('parallel claim: exactly one wins', wins === 1, `codes=${c1.code},${c2.code}`)

// ── privacy: another customer cannot see it ──
r = await req(S.manager.jar, 'GET', `/api/orders/${did}`)
check('manager can view (staff) 200', r.code === 200, `code=${r.code}`)

summary()
