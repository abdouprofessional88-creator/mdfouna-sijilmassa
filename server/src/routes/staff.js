import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errors.js'
import { validate } from '../validation/schemas.js'
import {
  reservationStatusSchema, tableSchema, tablePatchSchema,
  staffCreateSchema, rolePatchSchema, activePatchSchema, passwordResetSchema,
  menuItemPatchSchema, offerPatchSchema,
  orderStatusChangeSchema, categoryCreateSchema, categoryPatchSchema,
  menuItemCreateSchema, menuItemPutSchema, offerCreateSchema, offerPutSchema,
  optionGroupCreateSchema, optionGroupPatchSchema, assignDriverSchema,
} from '../validation/schemas.js'
import * as staff from '../services/staffService.js'
import * as orderSvc from '../services/orderService.js'
import * as catalog from '../services/catalogService.js'
import * as menuSvc from '../services/menuService.js'
import { pool } from '../db/pool.js'
import { assignDriver } from '../services/deliveryService.js'

const r = Router()

// All staff routes require a non-customer role — enforced here AND per-route.
r.use(requireAuth, (req, res, next) =>
  ['receptionist', 'kitchen_staff', 'delivery_driver', 'manager', 'admin'].includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'هذه البوابة للموظفين فقط' })
)

const canManage = requireRole('admin', 'manager')
const adminOnly = requireRole('admin')

/* ── overview ── */
r.get('/overview', asyncHandler(async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  res.json(await staff.overviewCounts(today))
}))

/* ── reservations (all team) ── */
r.get('/reservations', asyncHandler(async (req, res) => {
  const { date, status, q, table, limit } = req.query
  if (status && !staff.RES_STATUSES.includes(status)) {
    return res.status(422).json({ error: 'حالة غير صالحة' })
  }
  res.json({ reservations: await staff.listReservations({ date, status, q, table, limit }) })
}))

r.get('/reservations/:id', asyncHandler(async (req, res) => {
  const row = await staff.getReservation(req.params.id)
  if (!row) return res.status(404).json({ error: 'الحجز غير موجود' })
  res.json({ reservation: row })
}))

r.patch('/reservations/:id/status', validate(reservationStatusSchema), asyncHandler(async (req, res) => {
  res.json({ reservation: await staff.setReservationStatus(req.params.id, req.validated.status) })
}))

/* ── tables (write: admin/manager; read: whole team via /api/tables) ── */
r.post('/tables', canManage, validate(tableSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ table: await staff.createTable(req.validated) })
}))

r.patch('/tables/:id', canManage, validate(tablePatchSchema), asyncHandler(async (req, res) => {
  res.json({ table: await staff.updateTable(req.params.id, req.validated) })
}))

/* ── menu & offers (admin/manager) ── */
r.get('/menu', canManage, asyncHandler(async (_req, res) => {
  const [categories, items, offers] = await Promise.all([
    catalog.listCategories(), catalog.listItems(), catalog.listOffers(),
  ])
  res.json({ categories, items, offers })
}))

r.patch('/menu-items/:id', canManage, validate(menuItemPatchSchema), asyncHandler(async (req, res) => {
  res.json(await staff.updateMenuItem(req.params.id, req.validated))
}))

r.patch('/offers/:id', canManage, validate(offerPatchSchema), asyncHandler(async (req, res) => {
  res.json(await staff.updateOffer(req.params.id, req.validated))
}))

/* ── full menu catalog management (admin/manager) ── */
r.post('/categories', canManage, validate(categoryCreateSchema), asyncHandler(async (req, res) => {
  try {
    res.status(201).json({ category: await menuSvc.createCategory(req.validated) })
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') { e.status = 409; e.message = 'هذا المعرف مستعمل مسبقاً' }
    throw e
  }
}))
r.patch('/categories/:id', canManage, validate(categoryPatchSchema), asyncHandler(async (req, res) => {
  res.json({ category: await menuSvc.updateCategory(req.params.id, req.validated) })
}))
r.delete('/categories/:id', canManage, asyncHandler(async (req, res) => {
  res.json(await menuSvc.deleteCategory(req.params.id))
}))

r.post('/menu-items', canManage, validate(menuItemCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ item: await menuSvc.createItem(req.validated) })
}))
r.patch('/menu-items/:id/full', canManage, validate(menuItemPutSchema), asyncHandler(async (req, res) => {
  res.json({ item: await menuSvc.updateItem(req.params.id, req.validated) })
}))
r.delete('/menu-items/:id', canManage, asyncHandler(async (req, res) => {
  res.json(await menuSvc.deleteItem(req.params.id))
}))

r.post('/offers', canManage, validate(offerCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ offer: await menuSvc.createOffer(req.validated) })
}))
r.patch('/offers/:id/full', canManage, validate(offerPutSchema), asyncHandler(async (req, res) => {
  res.json({ offer: await menuSvc.updateOfferFull(req.params.id, req.validated) })
}))
r.delete('/offers/:id', canManage, asyncHandler(async (req, res) => {
  res.json(await menuSvc.deleteOffer(req.params.id))
}))

r.get('/option-groups', canManage, asyncHandler(async (_req, res) => {
  res.json({ groups: await menuSvc.listOptionGroups() })
}))
r.post('/option-groups', canManage, validate(optionGroupCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ group: await menuSvc.createOptionGroup(req.validated) })
}))
r.patch('/option-groups/:id', canManage, validate(optionGroupPatchSchema), asyncHandler(async (req, res) => {
  res.json({ group: await menuSvc.updateOptionGroup(req.params.id, req.validated) })
}))
r.delete('/option-groups/:id', canManage, asyncHandler(async (req, res) => {
  res.json(await menuSvc.deleteOptionGroup(req.params.id))
}))

/* ── restaurant settings (admin/manager) ── */
r.get('/settings', canManage, asyncHandler(async (_req, res) => {
  res.json({ settings: await staff.getSettings() })
}))

r.patch('/settings', canManage, asyncHandler(async (req, res) => {
  res.json({ settings: await staff.updateSettings(req.body || {}) })
}))

/* ── orders (all team: view + workflow transitions) ── */
r.get('/orders', asyncHandler(async (req, res) => {
  const { status, type, payment, limit } = req.query
  res.json({ orders: await orderSvc.listOrders({ status, type, payment, limit }) })
}))

r.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderSvc.getOrderById(req.params.id)
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  if (req.user.role === 'delivery_driver') {
    const [rows] = await pool.query(
      'SELECT id FROM delivery_assignments WHERE order_id = ? AND driver_id = ?', [req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(403).json({ error: 'هذا الطلب غير مُسند إليك' })
  }
  res.json({ order })
}))

// Validated workflow transition (role-checked inside the engine).
r.patch('/orders/:id/status', validate(orderStatusChangeSchema), asyncHandler(async (req, res) => {
  res.json({
    order: await orderSvc.moveOrderStatus({
      id: req.params.id, to: req.validated.status,
      actorId: req.user.id, actorRole: req.user.role, reason: req.validated.reason,
    }),
  })
}))

// Assign a driver (reception/manager/admin). Body: { driver_id }.
r.post('/orders/:id/assign-driver', requireRole('admin', 'manager', 'receptionist'), validate(assignDriverSchema), asyncHandler(async (req, res) => {
  res.json({
    order: await assignDriver({ orderId: req.params.id, driverId: req.validated.driver_id, actorId: req.user.id, actorRole: req.user.role }),
  })
}))

r.patch('/orders/:id/delivery', asyncHandler(async (req, res) => {
  const { delivery_status } = req.body || {}
  res.json({ order: await orderSvc.setDeliveryStatus(req.params.id, delivery_status) })
}))

// Refund a paid payment (manager/admin). Order must already be cancelled.
r.post('/payments/:id/refund', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const { refundPayment } = await import('../services/payments/paymentService.js')
  res.json(await refundPayment({ paymentId: req.params.id, actorId: req.user.id }))
}))

/* ── team (admin only) ── */
r.get('/users', adminOnly, asyncHandler(async (_req, res) => {
  res.json({ users: await staff.listTeam() })
}))

r.post('/users', adminOnly, validate(staffCreateSchema), asyncHandler(async (req, res) => {
  try {
    res.status(201).json({ user: await staff.createStaff(req.validated) })
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') e.status = 409, e.message = 'هذا البريد أو الهاتف مسجّل مسبقاً'
    throw e
  }
}))

r.patch('/users/:id/role', adminOnly, validate(rolePatchSchema), asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(422).json({ error: 'لا يمكنك تغيير دورك بنفسك' })
  }
  res.json({ user: await staff.setUserRole(req.params.id, req.validated.role) })
}))

r.patch('/users/:id/active', adminOnly, validate(activePatchSchema), asyncHandler(async (req, res) => {
  res.json({ user: await staff.setUserActive(req.params.id, req.validated.is_active, req.user.id) })
}))

r.post('/users/:id/reset-password', adminOnly, validate(passwordResetSchema), asyncHandler(async (req, res) => {
  await staff.resetUserPassword(req.params.id, req.user.id, req.validated.new_password)
  res.json({ ok: true })
}))

export default r
