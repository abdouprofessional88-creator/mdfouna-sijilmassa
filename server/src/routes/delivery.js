import { Router } from 'express'
import { asyncHandler } from '../middleware/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate, addressSchema, addressPatchSchema, quoteSchema, deliveryFailSchema } from '../validation/schemas.js'
import * as addresses from '../services/addressService.js'
import * as geo from '../services/geoService.js'
import * as delivery from '../services/deliveryService.js'
import { quoteDelivery } from '../utils/geo.js'
import { getFees } from '../services/orderService.js'

const r = Router()

/* ── saved customer addresses (owner-only, MySQL) ── */
r.get('/addresses', requireAuth, asyncHandler(async (req, res) => {
  res.json({ addresses: await addresses.listAddresses(req.user.id) })
}))

r.post('/addresses', requireAuth, validate(addressSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ address: await addresses.createAddress(req.user.id, req.validated) })
}))

r.patch('/addresses/:id', requireAuth, validate(addressPatchSchema), asyncHandler(async (req, res) => {
  res.json({ address: await addresses.updateAddress(req.params.id, req.user.id, req.validated) })
}))

r.delete('/addresses/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await addresses.deleteAddress(req.params.id, req.user.id))
}))

/* ── map provider proxy (keys/UA stay server-side) ── */
r.get('/geo/reverse', asyncHandler(async (req, res) => {
  const lat = req.query.lat
  const lng = req.query.lng ?? req.query.lon // accept both spellings
  if (!lat || !lng) return res.status(422).json({ error: 'إحداثيات ناقصة' })
  res.json(await geo.reverseGeocode(lat, lng))
}))

r.get('/geo/search', asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q || String(q).trim().length < 2) return res.status(422).json({ error: 'كلمة البحث قصيرة' })
  res.json({ results: await geo.searchPlaces(String(q).trim()) })
}))

/* ── delivery quote: server is the source of truth ── */
r.post('/delivery/quote', asyncHandler(async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: 'إحداثيات غير صالحة' })
  const { latitude, longitude, subtotal } = parsed.data
  const fees = await getFees()
  const q = quoteDelivery({
    custLat: latitude, custLng: longitude, subtotal,
    cfg: {
      lat: fees.restaurant_lat, lng: fees.restaurant_lng,
      maxKm: fees.delivery_max_km, fixed: fees.delivery_fee_mad,
      perKm: fees.delivery_fee_per_km, freeOver: fees.free_delivery_over_mad,
    },
  })
  if (!q.ok) return res.status(422).json({ error: 'عذراً، هذا العنوان خارج نطاق التوصيل حالياً.', ...q })
  res.json(q)
}))

const driverOnly = requireRole('delivery_driver', 'manager', 'admin')

/* ── driver workflow ── */
// Available ready orders (privacy: no phone/coords until claimed).
r.get('/delivery/available', requireAuth, driverOnly, asyncHandler(async (_req, res) => {
  res.json({ orders: await delivery.listAvailableDeliveries() })
}))

// Driver's own assignments (?active=0 for history).
r.get('/delivery/my-orders', requireAuth, driverOnly, asyncHandler(async (req, res) => {
  const active = req.query.active !== '0'
  res.json({ orders: await delivery.listDriverOrders(req.user.id, active) })
}))

// Full detail (assigned driver or privileged staff).
r.get('/delivery/:orderId', requireAuth, driverOnly, asyncHandler(async (req, res) => {
  res.json({ order: await delivery.getDriverOrderDetail(req.params.orderId, req.user.id, req.user.role) })
}))

// Claim a ready order (first-come, first-served — server lock decides).
r.post('/delivery/:orderId/claim', requireAuth, requireRole('delivery_driver'), asyncHandler(async (req, res) => {
  res.json({ order: await delivery.claimOrder({ orderId: req.params.orderId, driverId: req.user.id }) })
}))

// Start delivery only after physically receiving the ready order.
r.post('/delivery/:orderId/start', requireAuth, driverOnly, asyncHandler(async (req, res) => {
  res.json({
    order: await delivery.startDelivery({ orderId: req.params.orderId, driverId: req.user.id, actorRole: req.user.role }),
  })
}))

// Mark delivered.
r.post('/delivery/:orderId/complete', requireAuth, driverOnly, asyncHandler(async (req, res) => {
  res.json({
    order: await delivery.finishDelivery({ orderId: req.params.orderId, driverId: req.user.id, actorRole: req.user.role, outcome: 'delivered' }),
  })
}))

// Mark failed (reason required).
r.post('/delivery/:orderId/fail', requireAuth, driverOnly, validate(deliveryFailSchema), asyncHandler(async (req, res) => {
  res.json({
    order: await delivery.finishDelivery({ orderId: req.params.orderId, driverId: req.user.id, actorRole: req.user.role, outcome: 'failed', reason: req.validated.reason }),
  })
}))

export default r
