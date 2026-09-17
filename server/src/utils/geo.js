/** Geo math + delivery zone engine. Pure functions — unit-testable. */

const R_KM = 6371

export const toRad = (d) => (Number(d) * Math.PI) / 180

/** Haversine distance in km between two [lat,lng] points. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(a))
}

export function validCoords(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  return (
    Number.isFinite(la) && Number.isFinite(ln) &&
    la >= -90 && la <= 90 && ln >= -180 && ln <= 180 &&
    !(la === 0 && ln === 0)
  )
}

/**
 * Zone verdict from config { lat, lng, maxKm }.
 * inside: automatic · review: needs staff review (up to 1.5× radius) · outside: rejected.
 */
export function zoneFor(distanceKm, maxKm) {
  if (distanceKm <= maxKm) return 'inside'
  if (distanceKm <= maxKm * 1.5) return 'review'
  return 'outside'
}

/**
 * Fee model: fixed base + per-km, free above threshold. All server-side.
 * Returns { distanceKm (2dp), zone, fee (whole MAD), free }.
 */
export function quoteDelivery({ custLat, custLng, subtotal, cfg }) {
  const distance = distanceKm(cfg.lat, cfg.lng, custLat, custLng)
  const zone = zoneFor(distance, cfg.maxKm)
  if (zone === 'outside') {
    return { distanceKm: round2(distance), zone, fee: 0, free: false, ok: false }
  }
  const free = cfg.freeOver > 0 && subtotal >= cfg.freeOver
  const fee = free ? 0 : Math.round(cfg.fixed + cfg.perKm * distance)
  return { distanceKm: round2(distance), zone, fee, free, ok: true }
}

const round2 = (n) => Math.round(n * 100) / 100
