/**
 * Map/geocoding provider abstraction (server-side only — no keys in frontend).
 * Current provider: OpenStreetMap Nominatim (free, no key required).
 * Swap PROVIDER to change service without touching routes or UI.
 */

const UA = 'MdfounaSijilmassa/1.0 (restaurant website; contact: staff@sijilmassa.ma)'
const BASE = 'https://nominatim.openstreetmap.org'
const cache = new Map() // key → { at, data }
const TTL = 24 * 60 * 60 * 1000

function cached(key) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  cache.delete(key)
  return null
}
function store(key, data) {
  cache.set(key, { at: Date.now(), data })
  if (cache.size > 1000) cache.clear()
}

async function nominatim(path) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`geo provider ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(t)
  }
}

const pick = (addr = {}) => ({
  street: addr.road || addr.street || addr.pedestrian || null,
  neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || null,
  city: addr.city || addr.town || addr.village || addr.municipality || null,
  postal_code: addr.postcode || null,
  country: addr.country || null,
})

/** Coordinates → readable address parts. Throws {status:502} when unavailable. */
export async function reverseGeocode(lat, lng) {
  const key = `rev:${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`
  const hit = cached(key)
  if (hit) return hit
  try {
    const j = await nominatim(`/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar,fr`)
    if (!j || (!j.display_name && !j.address)) throw new Error('empty')
    const out = { formatted: j.display_name, ...pick(j.address) }
    store(key, out)
    return out
  } catch (e) {
    throw Object.assign(new Error('تعذّر تحديد العنوان من الخريطة — يمكنك المتابعة بالإحداثيات ووصف قصير'), { status: 502 })
  }
}

/** Text → candidate places (Morocco-biased). */
export async function searchPlaces(q) {
  const key = `search:${q.slice(0, 80)}`
  const hit = cached(key)
  if (hit) return hit
  try {
    const j = await nominatim(`/search?format=jsonv2&limit=6&countrycodes=ma&accept-language=ar,fr&q=${encodeURIComponent(q)}`)
    const out = (Array.isArray(j) ? j : []).map((p) => ({
      lat: Number(p.lat), lng: Number(p.lon),
      formatted: p.display_name, ...pick(p.address),
    }))
    store(key, out)
    return out
  } catch (e) {
    throw Object.assign(new Error('خدمة البحث غير متاحة حالياً'), { status: 502 })
  }
}
