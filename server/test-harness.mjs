/** Minimal API test harness (node fetch + manual cookie jar). */
const B = 'http://127.0.0.1:4000'
let pass = 0
let fail = 0

export function jar() {
  return { cookie: '' }
}

export async function req(j, method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (j && j.cookie) headers.Cookie = j.cookie
  const res = await fetch(B + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (j && setCookie) j.cookie = setCookie.split(';')[0]
  let json = null
  try { json = await res.json() } catch {}
  return { code: res.status, json }
}

export async function login(id, pw) {
  const j = jar()
  const r = await req(j, 'POST', '/api/auth/login', { identifier: id, password: pw })
  return { jar: j, code: r.code, user: r.json?.user }
}

export function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name} ${extra}`) }
}

export function summary() {
  console.log(`--- ${pass} passed, ${fail} failed ---`)
  process.exit(fail ? 1 : 0)
}
