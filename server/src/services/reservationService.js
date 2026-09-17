import { pool, query } from '../db/pool.js'
import {
  ACTIVE_RES_STATUSES, findConflicts, getSlotConfig, slotEnd, withinWindows,
} from './availabilityService.js'

/** Reservations for the signed-in customer, with table info. */
export async function listMyReservations(customerId) {
  return query(
    `SELECT r.id, r.reservation_date, r.start_time, r.end_time, r.guest_count,
            r.special_requests, r.occasion, r.status, r.created_at,
            t.table_number, t.area AS table_area, t.capacity AS table_capacity
     FROM reservations r
     LEFT JOIN restaurant_tables t ON t.id = r.table_id
     WHERE r.customer_id = ?
     ORDER BY r.reservation_date DESC, r.start_time DESC`,
    [customerId]
  )
}

const conflictError = (tableNumber) =>
  Object.assign(new Error(`الطاولة ${tableNumber} محجوزة في هذا الوقت — اختر وقتاً أو طاولة أخرى`), { status: 409 })

/**
 * Real reservation engine:
 * 1. Validates table exists, enabled, and fits the party.
 * 2. Computes end_time from the configured slot duration.
 * 3. Enforces service windows.
 * 4. Re-validates overlap INSIDE a transaction holding a table-row lock
 *    (SELECT ... FOR UPDATE) so two concurrent requests cannot double-book.
 * 5. Everything lands as `pending` for staff review.
 */
export async function createReservation(customerId, input) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const cfg = await getSlotConfig(conn)

    let table = null
    if (input.table_id) {
      // Row lock serializes concurrent bookings for the same table.
      const [trows] = await conn.query('SELECT * FROM restaurant_tables WHERE id = ? FOR UPDATE', [input.table_id])
      table = trows[0] || null
      if (!table) throw Object.assign(new Error('الطاولة المختارة غير موجودة'), { status: 422 })
      if (table.status === 'maintenance') throw Object.assign(new Error('الطاولة المختارة معطلة حالياً'), { status: 422 })
      if (table.capacity < input.guest_count) {
        throw Object.assign(new Error(`الطاولة ${table.table_number} تتسع لـ ${table.capacity} فقط`), { status: 422 })
      }
    }

    const endTime = slotEnd(input.start_time, cfg.durationMin)
    if (!withinWindows(cfg.windows, input.start_time, endTime)) {
      throw Object.assign(new Error('الوقت خارج أوقات الاستقبال — اختر وقتاً آخر'), { status: 422 })
    }

    if (table) {
      const conflicts = await findConflicts(conn, {
        tableId: table.id, date: input.reservation_date,
        startTime: input.start_time, endTime, durationMin: cfg.durationMin,
      })
      if (conflicts.length > 0) throw conflictError(table.table_number)
    }

    const [r] = await conn.query(
      `INSERT INTO reservations (customer_id, table_id, reservation_date, start_time, end_time, guest_count,
        special_requests, occasion, status)
       VALUES (?,?,?,?,?,?,?,?,'pending')`,
      [customerId, table ? table.id : null, input.reservation_date, input.start_time, endTime,
        input.guest_count, input.special_requests || null, input.occasion || null]
    )
    await conn.commit()
    const [rows] = await pool.query(
      `SELECT r.id, r.reservation_date, r.start_time, r.end_time, r.guest_count, r.special_requests,
              r.occasion, r.status, t.table_number
       FROM reservations r LEFT JOIN restaurant_tables t ON t.id = r.table_id WHERE r.id = ?`,
      [r.insertId]
    )
    return rows[0]
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

/** Customer may cancel their own request while still pending. */
export async function cancelOwnReservation(customerId, id) {
  const [rows] = await pool.query('SELECT id, status FROM reservations WHERE id = ? AND customer_id = ?', [id, customerId])
  if (!rows[0]) throw Object.assign(new Error('الحجز غير موجود'), { status: 404 })
  if (rows[0].status !== 'pending') {
    throw Object.assign(new Error('لا يمكن إلغاء حجز تمت مراجعته — اتصل بالمطعم'), { status: 422 })
  }
  await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id])
  return { ok: true }
}

export { ACTIVE_RES_STATUSES }
