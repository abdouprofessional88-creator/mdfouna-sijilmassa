import { pool } from '../db/pool.js'
import { transitionOrder, notifyUsers } from './payments/workflow.js'
import { getOrderById } from './orderService.js'

/**
 * Delivery assignments. Claim race is resolved by:
 * 1. SELECT ... FOR UPDATE on the order row (serializes concurrent claims),
 * 2. UNIQUE(order_id) on delivery_assignments (second insert fails → 409).
 */

const ASSIGN_HEAD = `a.id, a.order_id, a.driver_id, a.status, a.failure_reason,
  a.assigned_at, a.accepted_at, a.started_at, a.delivered_at, a.failed_at,
  u.full_name AS driver_name, u.phone AS driver_phone`

async function activeAssignment(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT ${ASSIGN_HEAD} FROM delivery_assignments a JOIN users u ON u.id = a.driver_id
     WHERE a.order_id = ? AND a.status NOT IN ('delivered','failed','cancelled') ORDER BY a.id DESC LIMIT 1`,
    [orderId]
  )
  return rows[0] || null
}

async function requireDriver(conn, driverId) {
  const [rows] = await conn.query("SELECT id FROM users WHERE id = ? AND role = 'delivery_driver' AND is_active = 1", [driverId])
  if (!rows[0]) throw Object.assign(new Error('السائق غير صالح أو معطّل'), { status: 422 })
}

/** Reception/manager/admin assigns a specific driver to a ready order. */
export async function assignDriver({ orderId, driverId, actorId, actorRole }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [oRows] = await conn.query('SELECT * FROM orders WHERE id = ? AND order_type = ? FOR UPDATE', [orderId, 'delivery'])
    const o = oRows[0]
    if (!o) throw Object.assign(new Error('طلب التوصيل غير موجود'), { status: 404 })
    if (o.status !== 'ready') throw Object.assign(new Error('التعيين متاح فقط للطلبات الجاهزة'), { status: 422 })
    if (await activeAssignment(conn, orderId)) {
      throw Object.assign(new Error('هذا الطلب مُسند مسبقاً لسائق آخر'), { status: 409 })
    }
    await requireDriver(conn, driverId)
    await conn.query(
      "INSERT INTO delivery_assignments (order_id, driver_id, status, accepted_at) VALUES (?,?, 'accepted', NOW())",
      [orderId, driverId]
    )
    await transitionOrder(conn, { orderId, to: 'assigned_to_driver', actorId, actorRole, reason: `assigned driver ${driverId}` })
    await notifyUsers(conn, [driverId], {
      type: 'assignment', orderId, title: 'طلب توصيل جديد', message: `طلب ${o.order_number} بانتظارك`,
    })
    await conn.commit()
    return getOrderById(orderId)
  } catch (e) {
    try { await conn.rollback() } catch {}
    if (e.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('هذا الطلب مُسند مسبقاً لسائق آخر'), { status: 409 })
    throw e
  } finally {
    conn.release()
  }
}

/** Driver claims an available ready order (first-come, first-served). */
export async function claimOrder({ orderId, driverId }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [oRows] = await conn.query("SELECT * FROM orders WHERE id = ? AND order_type = ? FOR UPDATE", [orderId, 'delivery'])
    const o = oRows[0]
    if (!o) throw Object.assign(new Error('طلب التوصيل غير موجود'), { status: 404 })
    if (o.status !== 'ready') throw Object.assign(new Error('الطلب غير متاح للاستلام حالياً'), { status: 422 })
    if (await activeAssignment(conn, orderId)) {
      throw Object.assign(new Error('سبقك سائق آخر لهذا الطلب'), { status: 409 })
    }
    await requireDriver(conn, driverId)
    await conn.query(
      "INSERT INTO delivery_assignments (order_id, driver_id, status, accepted_at) VALUES (?,?, 'accepted', NOW())",
      [orderId, driverId]
    )
    await transitionOrder(conn, { orderId, to: 'assigned_to_driver', actorId: driverId, actorRole: 'delivery_driver', reason: 'driver claim' })
    await conn.commit()
    return getOrderById(orderId)
  } catch (e) {
    try { await conn.rollback() } catch {}
    if (e.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('سبقك سائق آخر لهذا الطلب'), { status: 409 })
    throw e
  } finally {
    conn.release()
  }
}

async function driverOwns(conn, orderId, driverId) {
  const a = await activeAssignment(conn, orderId)
  if (!a || Number(a.driver_id) !== Number(driverId)) {
    throw Object.assign(new Error('هذا الطلب غير مُسند إليك'), { status: 403 })
  }
  return a
}

/** Driver starts delivery only after physically receiving a ready order. */
export async function startDelivery({ orderId, driverId, actorRole }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const isDriver = actorRole === 'delivery_driver'
    if (isDriver) await driverOwns(conn, orderId, driverId)
    const [oRows] = await conn.query('SELECT status FROM orders WHERE id = ? FOR UPDATE', [orderId])
    if (!oRows[0]) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
    if (oRows[0].status !== 'assigned_to_driver') {
      throw Object.assign(new Error('لا يمكن بدء التوصيل قبل الجاهزية والإسناد'), { status: 422 })
    }
    await transitionOrder(conn, { orderId, to: 'out_for_delivery', actorId: driverId, actorRole, reason: 'started delivery' })
    await conn.query("UPDATE delivery_assignments SET status = 'started', started_at = NOW() WHERE order_id = ? AND status IN ('assigned','accepted')", [orderId])
    const [custRows] = await conn.query('SELECT customer_id FROM orders WHERE id = ?', [orderId])
    if (custRows[0]) {
      await notifyUsers(conn, [custRows[0].customer_id], {
        type: 'status', orderId, title: 'طلبك في الطريق 🛵', message: 'الموصل انطلق نحوك',
      })
    }
    await conn.commit()
    return getOrderById(orderId)
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

/** Driver marks delivered / failed (reason required for failure). */
export async function finishDelivery({ orderId, driverId, actorRole, outcome, reason }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const isDriver = actorRole === 'delivery_driver'
    if (isDriver) await driverOwns(conn, orderId, driverId)
    const to = outcome === 'failed' ? 'failed' : 'delivered'
    if (outcome === 'failed' && !(reason || '').trim()) {
      throw Object.assign(new Error('سبب التعذّر مطلوب'), { status: 422 })
    }
    // delivered is only reachable from out_for_delivery via the transition map
    await transitionOrder(conn, { orderId, to, actorId: driverId, actorRole, reason })
    await conn.query(
      `UPDATE delivery_assignments SET status = ?, ${to === 'failed' ? 'failed_at = NOW(), failure_reason = ?' : 'delivered_at = NOW()'} WHERE order_id = ? AND status NOT IN ('delivered','failed','cancelled')`,
      to === 'failed' ? [to, (reason || '').slice(0, 255), orderId] : [to, orderId]
    )
    await conn.commit()
    return getOrderById(orderId)
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

/** Orders available for drivers to claim (privacy: no phone/coords until claimed). */
export async function listAvailableDeliveries() {
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.city, o.delivery_distance_km, o.total, o.created_at,
            o.delivery_zone
     FROM orders o
     WHERE o.order_type = 'delivery' AND o.status = 'ready'
       AND NOT EXISTS (SELECT 1 FROM delivery_assignments a WHERE a.order_id = o.id AND a.status NOT IN ('delivered','failed','cancelled'))
     ORDER BY o.created_at ASC LIMIT 50`
  )
  return rows
}

/** Driver's own assignments (full details for active ones). */
export async function listDriverOrders(driverId, active = true) {
  const op = active ? 'NOT IN' : 'IN'
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.delivery_status, o.total, o.created_at,
            o.delivery_distance_km, o.delivery_zone, a.status AS assign_status
     FROM delivery_assignments a JOIN orders o ON o.id = a.order_id
     WHERE a.driver_id = ? AND a.status ${op} ('delivered','failed','cancelled')
     ORDER BY a.updated_at DESC LIMIT 50`,
    [driverId]
  )
  return rows
}

export async function getDriverOrderDetail(orderId, driverId, role) {
  const order = await getOrderById(orderId)
  if (!order) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 })
  const staffRoles = ['receptionist', 'manager', 'admin']
  if (staffRoles.includes(role)) return order
  if (role !== 'delivery_driver') throw Object.assign(new Error('غير مسموح'), { status: 403 })
  const [rows] = await pool.query('SELECT id FROM delivery_assignments WHERE order_id = ? AND driver_id = ?', [orderId, driverId])
  if (!rows[0]) throw Object.assign(new Error('هذا الطلب غير مُسند إليك'), { status: 403 })
  return order
}
