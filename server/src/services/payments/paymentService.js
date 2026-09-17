import { pool } from '../../db/pool.js'
import { provider, providerName, paymentCurrency } from './providers.js'
import { transitionOrder, notifyUsers, staffIdsByRoles } from './workflow.js'

/**
 * Payments: intents are created server-side with server-calculated amounts.
 * Only a verified provider webhook may mark an order paid — never the browser.
 */

export async function createIntent({ customerId, orderId, method }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [oRows] = await conn.query('SELECT * FROM orders WHERE id = ? AND customer_id = ? FOR UPDATE', [orderId, customerId])
    const o = oRows[0]
    if (!o) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
    if (o.status !== 'pending_payment') {
      throw Object.assign(new Error('هذا الطلب لا يقبل الدفع حالياً'), { status: 422 })
    }
    if (method === 'cash') {
      const [s] = await conn.query("SELECT `value` FROM settings WHERE `key` = 'cash_on_delivery'")
      if (s[0] && s[0].value === '0') throw Object.assign(new Error('الدفع نقداً معطّل حالياً'), { status: 422 })
      const [p] = await conn.query(
        "INSERT INTO payments (order_id, user_id, provider, provider_payment_id, amount, currency, status) VALUES (?,?, 'cash', ?, ?, 'MAD', 'unpaid')",
        [o.id, customerId, `cash_${o.order_number}`, o.total]
      )
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', ['received', o.id])
      await conn.query(
        'INSERT INTO order_status_history (order_id, changed_by, previous_status, new_status, reason) VALUES (?,?,?,?,?)',
        [o.id, customerId, 'pending_payment', 'received', 'cash on delivery']
      )
      await notifyUsers(conn, await staffIdsByRoles(conn, ['receptionist', 'manager', 'admin']), {
        type: 'order_received', orderId: o.id, title: 'طلب جديد (نقداً)', message: `طلب ${o.order_number} بمبلغ ${o.total} درهم`,
      })
      await conn.commit()
      const [payRows] = await pool.query('SELECT * FROM payments WHERE id = ?', [p.insertId])
      return { payment: payRows[0], action: null }
    }
    // card → provider intent (order stays pending_payment until webhook verifies)
    const [cfg] = await conn.query("SELECT `value` FROM settings WHERE `key` = 'card_enabled'")
    if (cfg[0] && cfg[0].value === '0') throw Object.assign(new Error('الدفع بالبطاقة معطّل حالياً'), { status: 422 })
    await conn.query("UPDATE payments SET status = 'cancelled' WHERE order_id = ? AND status IN ('pending','unpaid')", [o.id])
    const intent = await provider.createIntent({ orderId: o.id, orderNumber: o.order_number, amount: Number(o.total), currency: paymentCurrency() })
    const [p] = await conn.query(
      'INSERT INTO payments (order_id, user_id, provider, provider_payment_id, amount, currency, status) VALUES (?,?,?,?,?,?,?)',
      [o.id, customerId, providerName(), intent.provider_payment_id, o.total, paymentCurrency(), 'pending']
    )
    await conn.commit()
    const [payRows] = await pool.query('SELECT * FROM payments WHERE id = ?', [p.insertId])
    return { payment: payRows[0], action: intent.action }
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

export async function getPayment(id, { userId, role }) {
  const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id])
  const p = rows[0]
  if (!p) throw Object.assign(new Error('الدفعة غير موجودة'), { status: 404 })
  const isStaff = ['receptionist', 'kitchen_staff', 'delivery_driver', 'manager', 'admin'].includes(role)
  if (p.user_id !== userId && !isStaff) throw Object.assign(new Error('غير مسموح'), { status: 403 })
  return p
}

/**
 * Webhook entry: verifies signature, then applies idempotently in a transaction.
 * Duplicate events (same provider_event_id) return success WITHOUT re-applying.
 */
export async function applyWebhookEvent({ eventId, paymentId, outcome, amount }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [dupRows] = await conn.query('SELECT id FROM payments WHERE provider = ? AND provider_event_id = ?', [providerName(), eventId])
    if (dupRows[0]) {
      await conn.commit()
      return { deduped: true }
    }
    const [payRows] = await conn.query('SELECT * FROM payments WHERE provider = ? AND provider_payment_id = ? FOR UPDATE', [providerName(), paymentId])
    const payment = payRows[0]
    if (!payment) throw Object.assign(new Error('دفعة غير معروفة'), { status: 404 })
    if (payment.status === 'paid') {
      await conn.commit()
      return { deduped: true }
    }
    if (amount && Math.abs(Number(amount) - Number(payment.amount)) > 0.01) {
      throw Object.assign(new Error('المبلغ لا يطابق الفاتورة'), { status: 422 })
    }
    if (outcome === 'paid') {
      await conn.query("UPDATE payments SET status = 'paid', provider_event_id = ?, paid_at = NOW() WHERE id = ?", [eventId, payment.id])
      await conn.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [payment.order_id])
      await transitionOrder(conn, { orderId: payment.order_id, to: 'received', actorId: null, actorRole: 'system', reason: 'webhook paid', system: true })
      await notifyUsers(conn, await staffIdsByRoles(conn, ['receptionist', 'manager', 'admin']), {
        type: 'payment', orderId: payment.order_id, title: 'تم الدفع ✓', message: `طلب مدفوع بمبلغ ${payment.amount} درهم`,
      })
    } else if (outcome === 'failed') {
      await conn.query("UPDATE payments SET status = 'failed', provider_event_id = ?, failure_reason = 'provider reported failure' WHERE id = ?", [eventId, payment.id])
      await conn.query("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [payment.order_id])
    } else {
      await conn.query("UPDATE payments SET status = 'cancelled', provider_event_id = ? WHERE id = ?", [eventId, payment.id])
      await conn.query("UPDATE orders SET payment_status = 'cancelled' WHERE id = ? AND payment_status IN ('unpaid','pending')", [payment.order_id])
    }
    await conn.commit()
    return { deduped: false, outcome }
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

export async function refundPayment({ paymentId, actorId }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [payRows] = await conn.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [paymentId])
    const p = payRows[0]
    if (!p) throw Object.assign(new Error('الدفعة غير موجودة'), { status: 404 })
    if (p.status !== 'paid') throw Object.assign(new Error('لا يمكن استرجاع دفعة غير مدفوعة'), { status: 422 })
    const r = await provider.refund({ paymentId: p.provider_payment_id, amount: Number(p.amount) })
    await conn.query("UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE id = ?", [paymentId])
    await conn.query(
      'INSERT INTO order_status_history (order_id, changed_by, previous_status, new_status, reason) VALUES (?,?,?,?,?)',
      [p.order_id, actorId, null, 'refunded', `refund ${r.provider_refund_id || ''}`]
    )
    await conn.commit()
    return { ok: true }
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}
