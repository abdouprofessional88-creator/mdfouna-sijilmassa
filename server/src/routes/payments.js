import { Router } from 'express'
import { asyncHandler } from '../middleware/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validate, paymentCreateSchema } from '../validation/schemas.js'
import { pool } from '../db/pool.js'
import { provider, isMockProvider } from '../services/payments/providers.js'
import * as payments from '../services/payments/paymentService.js'

const r = Router()

// Create a payment intent for the customer's own order (server-calculated amount).
r.post('/payments/create', requireAuth, validate(paymentCreateSchema), asyncHandler(async (req, res) => {
  const { order_id, method } = req.validated
  const out = await payments.createIntent({ customerId: req.user.id, orderId: order_id, method })
  res.status(201).json({ payment: out.payment, action: out.action, provider: provider.name })
}))

// Read own payment (or any, for staff).
r.get('/payments/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json({ payment: await payments.getPayment(req.params.id, { userId: req.user.id, role: req.user.role }) })
}))

/**
 * Provider webhook. Raw body preserved for signature verification.
 * Idempotent via provider_event_id — duplicates return success without re-applying.
 */
r.post('/payments/webhook', asyncHandler(async (req, res) => {
  // NOTE: mounted with express.raw() in app.js — req.body is a Buffer here.
  const signature = req.headers['x-provider-signature'] || req.headers['x-webhook-signature'] || ''
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {})
  let event
  try {
    event = provider.parseWebhook({ rawBody, signature })
  } catch (e) {
    console.error('[WEBHOOK] signature/parse failed:', e.message)
    return res.status(e.status || 400).json({ error: e.message })
  }
  try {
    const out = await payments.applyWebhookEvent(event)
    res.json({ ok: true, ...out })
  } catch (e) {
    console.error('[WEBHOOK] apply failed:', event, e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
}))

// DEV ONLY: simulate the bank calling our webhook (mock_dev provider only).
// In production this route does not exist functionally (provider must be real).
r.post('/payments/mock/confirm', requireAuth, asyncHandler(async (req, res) => {
  if (!isMockProvider()) return res.status(403).json({ error: 'المحاكاة للتطوير فقط' })
  const { provider_payment_id, outcome } = req.body || {}
  if (!provider_payment_id || !['paid', 'failed', 'cancelled'].includes(outcome)) {
    return res.status(422).json({ error: 'بيانات غير صالحة' })
  }
  // ownership check: the intent must belong to the caller
  const [rows] = await pool.query(
    'SELECT user_id, amount FROM payments WHERE provider = ? AND provider_payment_id = ?',
    [provider.name, provider_payment_id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'الدفعة غير موجودة' })
  if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'غير مسموح' })
  const event = {
    event_id: `mock_evt_${Date.now().toString(36)}`,
    payment_id: provider_payment_id,
    outcome,
    amount: Number(rows[0].amount),
  }
  const { body, signature } = provider.signEvent(event)
  const parsed = provider.parseWebhook({ rawBody: body, signature })
  const out = await payments.applyWebhookEvent(parsed)
  res.json({ ok: true, ...out })
}))

// Refund (manager/admin only — enforced in staff router below via separate route).
export default r
