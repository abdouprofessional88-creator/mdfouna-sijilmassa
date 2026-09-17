import { pool } from '../../db/pool.js'
import { provider, providerName, paymentCurrency, isMockProvider, paymentConfig } from './providers.js'

export { paymentConfig }

/**
 * Server-controlled order workflow. Map: from → { to: [roles allowed] }.
 * 'system' = webhook/internal events. Customers NEVER change status directly
 * (they use dedicated cancel/claim actions validated separately).
 */
export const ORDER_TRANSITIONS = {
  pending_payment: { received: ['system'], cancelled: ['customer', 'receptionist', 'manager', 'admin'] },
  received: {
    accepted: ['receptionist', 'manager', 'admin'],
    rejected: ['receptionist', 'manager', 'admin'],
    cancelled: ['receptionist', 'manager', 'admin'],
  },
  accepted: {
    preparing: ['receptionist', 'kitchen_staff', 'manager', 'admin'],
    rejected: ['receptionist', 'manager', 'admin'],
    cancelled: ['receptionist', 'manager', 'admin'],
  },
  preparing: {
    ready: ['receptionist', 'kitchen_staff', 'manager', 'admin'],
    cancelled: ['manager', 'admin'],
  },
  ready: {
    assigned_to_driver: ['receptionist', 'manager', 'admin', 'delivery_driver'],
    cancelled: ['manager', 'admin'],
  },
  assigned_to_driver: {
    out_for_delivery: ['delivery_driver', 'manager', 'admin'],
    ready: ['manager', 'admin'],
    cancelled: ['manager', 'admin'],
  },
  out_for_delivery: {
    delivered: ['delivery_driver', 'manager', 'admin'],
    failed: ['delivery_driver', 'manager', 'admin'],
  },
  delivered: { cancelled: ['admin'] }, // authorized correction only
  failed: { cancelled: ['manager', 'admin'] },
  cancelled: {},
  rejected: {},
}

export const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS)

export function assertTransition(from, to, role, opts = {}) {
  const allowed = (ORDER_TRANSITIONS[from] || {})[to]
  if (!allowed) {
    throw Object.assign(new Error(`انتقال غير مسموح: ${from} ← ${to}`), { status: 422 })
  }
  if (opts.system) {
    if (!allowed.includes('system')) throw Object.assign(new Error('انتقال داخلي فقط'), { status: 403 })
    return
  }
  if (!allowed.includes(role) && role !== 'admin') {
    throw Object.assign(new Error('غير مسموح لهذا الدور'), { status: 403 })
  }
}

async function logHistory(conn, { orderId, changedBy, previous, next, reason }) {
  await conn.query(
    'INSERT INTO order_status_history (order_id, changed_by, previous_status, new_status, reason) VALUES (?,?,?,?,?)',
    [orderId, changedBy || null, previous, next, reason || null]
  )
}

export async function notifyUsers(conn, userIds, { type, orderId, title, message }) {
  const ids = [...new Set(userIds)].filter(Boolean)
  for (const uid of ids) {
    await conn.query(
      'INSERT INTO notifications (user_id, type, order_id, title, message) VALUES (?,?,?,?,?)',
      [uid, type, orderId || null, title, message || null]
    )
  }
}

export async function staffIdsByRoles(conn, roles) {
  const [rows] = await conn.query('SELECT id FROM users WHERE role IN (?) AND is_active = 1', [roles])
  return rows.map((r) => r.id)
}

/** Move an order through the workflow (validates transition + logs history). */
export async function transitionOrder(conn, { orderId, to, actorId, actorRole, reason, system = false }) {
  const [lockRows] = await conn.query('SELECT id, status, customer_id FROM orders WHERE id = ? FOR UPDATE', [orderId])
  const cur = lockRows[0]
  if (!cur) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
  assertTransition(cur.status, to, actorRole, { system })
  await conn.query('UPDATE orders SET status = ? WHERE id = ?', [to, orderId])
  await logHistory(conn, { orderId, changedBy: system ? null : actorId, previous: cur.status, next: to, reason })
  return { ...cur, status: to }
}
