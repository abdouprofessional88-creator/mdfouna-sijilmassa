import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validate, orderCreateSchema, reservationCreateSchema } from '../validation/schemas.js'
import * as catalog from '../services/catalogService.js'
import * as reservations from '../services/reservationService.js'
import * as orders from '../services/orderService.js'
import { listAvailableTables } from '../services/availabilityService.js'
import { query } from '../db/pool.js'

const availQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  guests: z.coerce.number().int().min(1).max(50),
})

const r = Router()

// Public catalog
r.get('/menu/categories', asyncHandler(async (_req, res) => {
  res.json({ categories: await catalog.listCategories() })
}))
r.get('/menu/items', asyncHandler(async (_req, res) => {
  res.json({ items: await catalog.listItems() })
}))
r.get('/menu', asyncHandler(async (_req, res) => {
  const [categories, items, offers, fees] = await Promise.all([
    catalog.listCategories(), catalog.listItems(), catalog.listOffers(), orders.getFees(),
  ])
  res.json({ categories, items, offers, fees })
}))
r.get('/offers', asyncHandler(async (_req, res) => {
  res.json({ offers: await catalog.listOffers() })
}))

// Tables (read-only list; use /tables/available for real availability)
r.get('/tables', asyncHandler(async (_req, res) => {
  res.json({ tables: await catalog.listTables() })
}))

// Real availability: date + start time + guests → genuinely free tables.
r.get('/tables/available', requireAuth, asyncHandler(async (req, res) => {
  const parsed = availQuery.safeParse(req.query)
  if (!parsed.success) return res.status(422).json({ error: 'بيانات غير صالحة' })
  if (parsed.data.date < new Date().toISOString().slice(0, 10)) {
    return res.status(422).json({ error: 'التاريخ يجب أن يكون اليوم أو بعده' })
  }
  res.json(await listAvailableTables({
    date: parsed.data.date, startTime: parsed.data.time, guests: parsed.data.guests,
  }))
}))

// Customer's own reservations (protected)
r.get('/reservations/mine', requireAuth, asyncHandler(async (req, res) => {
  res.json({ reservations: await reservations.listMyReservations(req.user.id) })
}))

// Reservation REQUEST — overlap-checked, lands as `pending` for staff review.
r.post('/reservations', requireAuth, validate(reservationCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ reservation: await reservations.createReservation(req.user.id, req.validated) })
}))

// Customer cancels their own pending request.
r.patch('/reservations/mine/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  res.json(await reservations.cancelOwnReservation(req.user.id, req.params.id))
}))

// Product customization options (public, from DB)
r.get('/menu/options', asyncHandler(async (_req, res) => {
  res.json({ groups: await orders.listOptions() })
}))

// Ordering (customer account required — prices recomputed server-side)
r.post('/orders', requireAuth, validate(orderCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ order: await orders.createOrder(req.user.id, req.validated) })
}))

r.get('/orders/mine', requireAuth, asyncHandler(async (req, res) => {
  res.json({ orders: await orders.listMyOrders(req.user.id) })
}))

r.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
  const order = await orders.getOrderById(req.params.id, req.user.role === 'customer' ? req.user.id : null)
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  res.json({ order })
}))

// Customer cancels their own order (only before acceptance/payment).
r.post('/orders/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ error: 'مخصص للزبناء' })
  res.json({ order: await orders.cancelOwnOrder(req.user.id, req.params.id) })
}))

// Notifications (own only).
r.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query(
    'SELECT id, type, order_id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  )
  const unread = rows.filter((n) => !n.is_read).length
  res.json({ notifications: rows, unread })
}))

r.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  res.json({ ok: true })
}))

r.patch('/notifications/read-all', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id])
  res.json({ ok: true })
}))

export default r
