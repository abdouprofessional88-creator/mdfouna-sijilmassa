import { pool, query } from '../db/pool.js'
import { hashPassword } from '../utils/password.js'
import { findConflicts, getSlotConfig, slotEnd } from './availabilityService.js'

export const RES_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']

const RES_SELECT = `r.id, r.reservation_date, r.start_time, r.end_time, r.guest_count,
  r.special_requests, r.occasion, r.status, r.created_at,
  u.full_name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
  t.table_number, t.area AS table_area`

const RES_FROM = `FROM reservations r
  JOIN users u ON u.id = r.customer_id
  LEFT JOIN restaurant_tables t ON t.id = r.table_id`

export async function listReservations({ date, status, q, table, limit = 200 } = {}) {
  const where = []
  const params = []
  if (date) { where.push('r.reservation_date = ?'); params.push(date) }
  if (status) { where.push('r.status = ?'); params.push(status) }
  if (table) { where.push('t.table_number LIKE ?'); params.push(`%${table}%`) }
  if (q) {
    where.push('(u.full_name LIKE ? OR u.phone LIKE ? OR IFNULL(t.table_number, "") LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  const sql = `SELECT ${RES_SELECT} ${RES_FROM}${where.length ? ' WHERE ' + where.join(' AND ') : ''}
    ORDER BY r.reservation_date DESC, r.start_time ASC LIMIT ${Math.min(Number(limit) || 200, 500)}`
  return query(sql, params)
}

export async function getReservation(id) {
  const rows = await query(`SELECT ${RES_SELECT} ${RES_FROM} WHERE r.id = ?`, [id])
  return rows[0] || null
}

export async function setReservationStatus(id, status) {
  if (!RES_STATUSES.includes(status)) {
    const err = new Error('حالة غير صالحة')
    err.status = 422
    throw err
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [lockRows] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id])
    const current = lockRows[0]
    if (!current) {
      const err = new Error('الحجز غير موجود')
      err.status = 404
      throw err
    }
    // Activating a booking must not create a double-booking.
    if ((status === 'confirmed' || status === 'seated') && current.table_id) {
      const cfg = await getSlotConfig(conn)
      const day = String(current.reservation_date).slice(0, 10)
      const start = String(current.start_time).slice(0, 8)
      const end = current.end_time
        ? String(current.end_time).slice(0, 8)
        : slotEnd(start.slice(0, 5), cfg.durationMin)
      const conflicts = await findConflicts(conn, {
        tableId: current.table_id, date: day,
        startTime: start, endTime: end,
        durationMin: cfg.durationMin,
        excludeId: current.id,
      })
      if (conflicts.length > 0) {
        const err = new Error('تعارض: الطاولة محجوزة في هذا الوقت لحجز آخر — لا يمكن التأكيد')
        err.status = 409
        throw err
      }
    }
    await conn.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id])
    await conn.commit()
    return getReservation(id)
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    conn.release()
  }
}

export async function overviewCounts(today) {
  const [[row]] = [await query(
    `SELECT
       SUM(reservation_date = ? AND status NOT IN ('cancelled','no_show','completed')) AS today,
       SUM(reservation_date >= ? AND status NOT IN ('cancelled','no_show','completed')) AS upcoming,
       SUM(status = 'pending') AS pending,
       SUM(status = 'confirmed') AS confirmed,
       SUM(status = 'completed') AS completed,
       SUM(status = 'cancelled') AS cancelled
     FROM reservations`, [today, today]
  )]
  const tables = await query(
    `SELECT status, COUNT(*) n FROM restaurant_tables GROUP BY status`
  )
  const bookingsToday = await query(
    `SELECT table_id, COUNT(*) n FROM reservations
     WHERE reservation_date = ? AND status NOT IN ('cancelled','no_show') AND table_id IS NOT NULL
     GROUP BY table_id`, [today]
  )
  return {
    reservations: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v || 0)])),
    tables: Object.fromEntries(tables.map((t) => [t.status, Number(t.n)])),
    bookingsToday: Object.fromEntries(bookingsToday.map((b) => [b.table_id, Number(b.n)])),
  }
}

/* ── tables (write: admin/manager) ── */
export async function createTable({ table_number, capacity, area, description, status }) {
  const r = await query(
    'INSERT INTO restaurant_tables (table_number, capacity, area, description, status) VALUES (?,?,?,?,?)',
    [table_number, capacity, area, description || null, status || 'available']
  )
  const rows = await query('SELECT * FROM restaurant_tables WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function updateTable(id, patch) {
  const allowed = ['table_number', 'capacity', 'area', 'description', 'status']
  const sets = []
  const params = []
  for (const k of allowed) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); params.push(patch[k]) }
  }
  if (!sets.length) {
    const err = new Error('لا تغييرات')
    err.status = 422
    throw err
  }
  params.push(id)
  const r = await query(`UPDATE restaurant_tables SET ${sets.join(', ')} WHERE id = ?`, params)
  if (r.affectedRows === 0) {
    const err = new Error('الطاولة غير موجودة')
    err.status = 404
    throw err
  }
  const rows = await query('SELECT * FROM restaurant_tables WHERE id = ?', [id])
  return rows[0]
}

/* ── settings (admin/manager) ── */
const SETTING_KEYS = ['display_name', 'phone_primary', 'address_note', 'opening_hours_note',
  'reservation_notice', 'delivery_fee_mad', 'free_delivery_over_mad', 'delivery_fee_per_km',
  'delivery_max_km', 'restaurant_lat', 'restaurant_lng',
  'reservation_duration_min', 'service_windows']

export async function getSettings() {
  const rows = await query('SELECT `key`, `value` FROM settings')
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function updateSettings(patch) {
  const entries = Object.entries(patch).filter(([k, v]) => SETTING_KEYS.includes(k) && typeof v === 'string')
  if (!entries.length) {
    const err = new Error('لا تغييرات صالحة')
    err.status = 422
    throw err
  }
  for (const [k, v] of entries) {
    await query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [k, v.slice(0, 500)])
  }
  return getSettings()
}

/* ── team (admin only) ── */
export async function listTeam() {
  return query(
    "SELECT id, full_name, email, phone, role, is_active, created_at FROM users WHERE role != 'customer' ORDER BY FIELD(role,'admin','manager','receptionist','kitchen_staff','delivery_driver'), id"
  )
}

const MANAGEABLE_ROLES = ['receptionist', 'kitchen_staff', 'delivery_driver', 'manager']

export async function createStaff({ full_name, email, phone, password, role }) {
  if (!MANAGEABLE_ROLES.includes(role)) {
    const err = new Error('دور غير مسموح')
    err.status = 422
    throw err
  }
  const password_hash = await hashPassword(password)
  const r = await query(
    'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?,?,?,?,?)',
    [full_name, email.toLowerCase(), phone, password_hash, role]
  )
  const rows = await query('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?', [r.insertId])
  return rows[0]
}

export async function setUserRole(id, role) {
  if (!['receptionist', 'kitchen_staff', 'delivery_driver', 'manager', 'admin', 'customer'].includes(role)) {
    const err = new Error('دور غير صالح')
    err.status = 422
    throw err
  }
  const r = await query('UPDATE users SET role = ? WHERE id = ?', [role, id])
  if (r.affectedRows === 0) {
    const err = new Error('المستخدم غير موجود')
    err.status = 404
    throw err
  }
  const rows = await query('SELECT id, full_name, email, phone, role, is_active FROM users WHERE id = ?', [id])
  return rows[0]
}

/** Activate / deactivate an account (admin only). Deactivation is immediate. */
export async function setUserActive(id, isActive, selfId) {
  if (Number(id) === Number(selfId)) {
    const err = new Error('لا يمكنك تعطيل حسابك بنفسك')
    err.status = 422
    throw err
  }
  const r = await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id])
  if (r.affectedRows === 0) {
    const err = new Error('المستخدم غير موجود')
    err.status = 404
    throw err
  }
  const rows = await query('SELECT id, full_name, email, phone, role, is_active FROM users WHERE id = ?', [id])
  return rows[0]
}

/** Admin password reset — returns nothing secret; new password shown once to the admin. */
export async function resetUserPassword(id, selfId, newPassword) {
  if (Number(id) === Number(selfId)) {
    const err = new Error('غيّر كلمتك من ملفك الشخصي')
    err.status = 422
    throw err
  }
  if (!newPassword || String(newPassword).length < 8) {
    const err = new Error('كلمة المرور 8 أحرف على الأقل')
    err.status = 422
    throw err
  }
  const password_hash = await hashPassword(String(newPassword))
  const r = await query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id])
  if (r.affectedRows === 0) {
    const err = new Error('المستخدم غير موجود')
    err.status = 404
    throw err
  }
  return { ok: true }
}

/* ── menu & offers (admin/manager) ── */
export async function updateMenuItem(id, { is_available, base_price, availability_mode }) {
  const sets = []
  const params = []
  if (is_available !== undefined) { sets.push('is_available = ?'); params.push(is_available ? 1 : 0) }
  if (base_price !== undefined) {
    if (Number(base_price) < 0) { const e = new Error('السعر غير صالح'); e.status = 422; throw e }
    sets.push('base_price = ?'); params.push(base_price)
  }
  if (availability_mode !== undefined) {
    if (!['all_day', 'lunch', 'dinner', 'preorder'].includes(availability_mode)) {
      const e = new Error('وضع التوفر غير صالح'); e.status = 422; throw e
    }
    sets.push('availability_mode = ?'); params.push(availability_mode)
  }
  if (!sets.length) { const e = new Error('لا تغييرات'); e.status = 422; throw e }
  params.push(id)
  const r = await query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params)
  if (r.affectedRows === 0) { const e = new Error('الصنف غير موجود'); e.status = 404; throw e }
  return { ok: true }
}

export async function updateOffer(id, { is_active, price }) {
  const sets = []
  const params = []
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0) }
  if (price !== undefined) {
    if (Number(price) < 0) { const e = new Error('السعر غير صالح'); e.status = 422; throw e }
    sets.push('price = ?'); params.push(price)
  }
  if (!sets.length) { const e = new Error('لا تغييرات'); e.status = 422; throw e }
  params.push(id)
  const r = await query(`UPDATE offers SET ${sets.join(', ')} WHERE id = ?`, params)
  if (r.affectedRows === 0) { const e = new Error('العرض غير موجود'); e.status = 404; throw e }
  return { ok: true }
}
