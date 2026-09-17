import { pool } from '../db/pool.js'

/**
 * CENTRAL reservation-blocking rule:
 * - pending / confirmed / seated → BLOCK the table
 * - completed / cancelled / no_show → do NOT block (table freed)
 * Business rule for no_show: the slot is released so the table can be rebooked.
 */
export const ACTIVE_RES_STATUSES = ['pending', 'confirmed', 'seated']

const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}
export const toTime = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`

/** Slot config from settings (single source — never hardcoded in routes). */
export async function getSlotConfig(conn = null) {
  const run = conn
    ? (sql) => conn.query(sql).then(([rows]) => rows)
    : (sql) => pool.query(sql).then(([rows]) => rows)
  const rows = await run("SELECT `key`, `value` FROM settings WHERE `key` IN ('reservation_duration_min','service_windows')")
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const durationMin = Math.min(480, Math.max(30, Number(s.reservation_duration_min) || 120))
  const windows = String(s.service_windows || '12:00-15:00,19:00-23:00')
    .split(',')
    .map((w) => w.trim().split('-'))
    .filter((w) => w.length === 2 && !w.some((x) => Number.isNaN(toMin(x))))
    .map(([from, to]) => ({ from: toMin(from), to: toMin(to) }))
  return { durationMin, windows }
}

export const slotEnd = (startTime, durationMin) => toTime(toMin(startTime) + durationMin)

/** Start+end must both fall inside one service window. */
export function withinWindows(windows, startTime, endTime) {
  const s = toMin(startTime)
  const e = toMin(endTime)
  if (!(e > s)) return false
  return windows.some((w) => s >= w.from && e <= w.to)
}

/**
 * Proper time-overlap detection.
 * Overlap ⟺ existing.start < newEnd AND existing.end > newStart
 * (strict inequalities → adjacent bookings do NOT overlap).
 * Legacy rows with end_time NULL are treated as start + configured duration.
 */
export async function findConflicts(conn, { tableId, date, startTime, endTime, durationMin, excludeId = null }) {
  // Always compare full 'HH:MM:SS' — MySQL would compare 'HH:MM' strings lexically!
  const pad = (t) => {
    const s = String(t)
    return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s
  }
  const start = pad(startTime)
  const end = pad(endTime)
  const params = [tableId, date, end, durationMin * 60, start]
  let sql = `SELECT id, start_time, end_time, status FROM reservations
    WHERE table_id = ? AND reservation_date = ?
      AND status IN (${ACTIVE_RES_STATUSES.map(() => '?').join(',')})
      AND start_time < ?
      AND COALESCE(end_time, ADDTIME(start_time, SEC_TO_TIME(?))) > ?`
  const allParams = [...params.slice(0, 2), ...ACTIVE_RES_STATUSES, ...params.slice(2)]
  if (excludeId) {
    sql += ' AND id != ?'
    allParams.push(excludeId)
  }
  const [rows] = await conn.query(sql, allParams)
  return rows
}

/** Tables genuinely available: capacity ✓, not disabled ✓, no overlap ✓. */
export async function listAvailableTables({ date, startTime, guests, durationMin = null }) {
  const conn = await pool.getConnection()
  try {
    const cfg = await getSlotConfig(conn)
    const dur = durationMin || cfg.durationMin
    const endTime = slotEnd(startTime, dur)
    if (!withinWindows(cfg.windows, startTime, endTime)) {
      return { tables: [], endTime, durationMin: dur, reason: 'outside_hours' }
    }
    const [tables] = await conn.query(
      'SELECT id, table_number, capacity, area, status, description FROM restaurant_tables WHERE capacity >= ? AND status != ? ORDER BY capacity, id',
      [guests, 'maintenance']
    )
    const free = []
    for (const t of tables) {
      const conflicts = await findConflicts(conn, { tableId: t.id, date, startTime, endTime, durationMin: dur })
      if (conflicts.length === 0) free.push({ ...t, slot_end: endTime })
    }
    return { tables: free, endTime, durationMin: dur, reason: free.length ? null : 'none_available' }
  } finally {
    conn.release()
  }
}
