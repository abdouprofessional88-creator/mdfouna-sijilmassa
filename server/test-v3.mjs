import { jar, req, login, check, summary } from './test-harness.mjs'

const mgr = await login('manager@sijilmassa.ma', 'Manager1234!')
const adm = await login('admin@sijilmassa.ma', 'Admin1234!')
const kit = await login('kitchen@sijilmassa.ma', 'Kitchen1234!')
check('mgr login', mgr.code === 200)

// ── menu CRUD ──
let r = await req(mgr.jar, 'POST', '/api/staff/categories', { name_ar: 'TZ Test Cat' })
check('create category 201', r.code === 201, `code=${r.code}`)
const catId = r.json.category.id
r = await req(mgr.jar, 'POST', '/api/staff/menu-items', {
  category_id: catId, name_ar: 'TZ Test Dish', base_price: 99,
})
check('create item 201', r.code === 201, `code=${r.code}`)
const itemId = r.json.item.id
r = await req(mgr.jar, 'PATCH', `/api/staff/menu-items/${itemId}/full`, { base_price: 111, badge_ar: 'TZ' })
check('update item', r.code === 200 && r.json.item.base_price === '111.00', `code=${r.code}`)
r = await req(kit.jar, 'POST', '/api/staff/menu-items', { category_id: catId, name_ar: 'X', base_price: 1 })
check('kitchen cannot create item 403', r.code === 403, `code=${r.code}`)
r = await req(mgr.jar, 'DELETE', `/api/staff/menu-items/${itemId}`)
check('delete item', r.code === 200, `code=${r.code}`)
r = await req(mgr.jar, 'DELETE', `/api/staff/categories/${catId}`)
check('delete empty category', r.code === 200, `code=${r.code}`)

// ── offers CRUD ──
r = await req(mgr.jar, 'POST', '/api/staff/offers', { title_ar: 'TZ Offer', price: 50 })
check('create offer 201', r.code === 201, `code=${r.code}`)
const offerId = r.json.offer.id
r = await req(mgr.jar, 'DELETE', `/api/staff/offers/${offerId}`)
check('delete offer', r.code === 200, `code=${r.code}`)

// ── option groups ──
r = await req(mgr.jar, 'GET', '/api/staff/option-groups')
check('list option groups', r.code === 200 && r.json.groups.length >= 8, `n=${r.json.groups?.length}`)
const gid = r.json.groups[0].id
r = await req(mgr.jar, 'PATCH', `/api/staff/option-groups/${gid}`, { is_active: false })
check('toggle group off', r.code === 200, `code=${r.code}`)
r = await req(mgr.jar, 'PATCH', `/api/staff/option-groups/${gid}`, { is_active: true })
check('toggle group on', r.code === 200, `code=${r.code}`)

// ── refund flow ──
const cust = await login('customer@sijilmassa.ma', 'Customer1234!')
check('customer login', cust.code === 200)
r = await req(cust.jar, 'POST', '/api/orders', {
  order_type: 'pickup', full_name: 'Refund T', phone: '0611223344',
  payment_method: 'card', special_instructions: 'tz-refund',
  items: [{ menu_item_id: 11, quantity: 1, options: {} }],
})
const roid = r.json.order.id
r = await req(cust.jar, 'POST', '/api/payments/create', { order_id: roid, method: 'card' })
const realPayId = r.json.payment.id
const realPpid = r.json.payment.provider_payment_id
await req(cust.jar, 'POST', '/api/payments/mock/confirm', { provider_payment_id: realPpid, outcome: 'paid' })
r = await req(mgr.jar, 'POST', `/api/staff/payments/${realPayId}/refund`)
check('manager refund 200', r.code === 200, `code=${r.code}`)
r = await req(mgr.jar, 'POST', `/api/staff/payments/999999/refund`)
check('refund bad id 404', r.code === 404, `code=${r.code}`)

// ── deactivation ──
const team = await req(adm.jar, 'GET', '/api/staff/users')
const target = team.json.users.find((u) => u.email === 'kitchen@sijilmassa.ma')
r = await req(adm.jar, 'PATCH', `/api/staff/users/${target.id}/active`, { is_active: false })
check('deactivate 200', r.code === 200, `code=${r.code}`)
const kl = await login('kitchen@sijilmassa.ma', 'Kitchen1234!')
check('deactivated login 403', kl.code === 403, `code=${kl.code}`)
r = await req(adm.jar, 'PATCH', `/api/staff/users/${target.id}/active`, { is_active: true })
check('reactivate 200', r.code === 200, `code=${r.code}`)
const kl2 = await login('kitchen@sijilmassa.ma', 'Kitchen1234!')
check('login works again', kl2.code === 200, `code=${kl2.code}`)

// ── notifications ──
r = await req(cust.jar, 'GET', '/api/notifications')
check('notifications list', r.code === 200 && Array.isArray(r.json.notifications), `code=${r.code}`)
if (r.json.notifications.length > 0) {
  const nid = r.json.notifications[0].id
  r = await req(cust.jar, 'PATCH', `/api/notifications/${nid}/read`)
  check('mark read', r.code === 200, `code=${r.code}`)
}
r = await req(cust.jar, 'PATCH', '/api/notifications/read-all')
check('read-all', r.code === 200, `code=${r.code}`)

summary()
