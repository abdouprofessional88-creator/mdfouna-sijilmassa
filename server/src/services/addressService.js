import { query } from '../db/pool.js'
import { validCoords } from '../utils/geo.js'

const FIELDS = `id, user_id, label, label_note, formatted_address, street, neighborhood,
  city, postal_code, country, latitude, longitude, accuracy_m, delivery_notes, is_default`

function assertCoords(lat, lng) {
  if (!validCoords(lat, lng)) {
    throw Object.assign(new Error('إحداثيات غير صالحة'), { status: 422 })
  }
}

export async function listAddresses(userId) {
  return query(`SELECT ${FIELDS} FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [userId])
}

export async function getAddress(id, userId) {
  const rows = await query(`SELECT ${FIELDS} FROM customer_addresses WHERE id = ? AND user_id = ?`, [id, userId])
  return rows[0] || null
}

export async function createAddress(userId, input) {
  assertCoords(input.latitude, input.longitude)
  const r = await query(
    `INSERT INTO customer_addresses (user_id, label, label_note, formatted_address, street, neighborhood,
      city, postal_code, country, latitude, longitude, accuracy_m, delivery_notes, is_default)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [userId, input.label, input.label_note || null, input.formatted_address,
      input.street || null, input.neighborhood || null, input.city || 'مكناس',
      input.postal_code || null, input.country || 'المغرب',
      input.latitude, input.longitude, input.accuracy_m || null,
      input.delivery_notes || null, input.is_default ? 1 : 0]
  )
  if (input.is_default) {
    await query('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [userId, r.insertId])
  } else {
    const [{ n }] = await query('SELECT COUNT(*) n FROM customer_addresses WHERE user_id = ?', [userId])
    if (Number(n) === 1) await query('UPDATE customer_addresses SET is_default = 1 WHERE id = ?', [r.insertId])
  }
  const rows = await query(`SELECT ${FIELDS} FROM customer_addresses WHERE id = ?`, [r.insertId])
  return rows[0]
}

export async function updateAddress(id, userId, patch) {
  const cur = await getAddress(id, userId)
  if (!cur) throw Object.assign(new Error('العنوان غير موجود'), { status: 404 })
  if (patch.latitude !== undefined || patch.longitude !== undefined) {
    assertCoords(patch.latitude ?? cur.latitude, patch.longitude ?? cur.longitude)
  }
  const allowed = ['label', 'label_note', 'formatted_address', 'street', 'neighborhood', 'city',
    'postal_code', 'country', 'latitude', 'longitude', 'accuracy_m', 'delivery_notes']
  const sets = []
  const params = []
  for (const k of allowed) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); params.push(patch[k]) }
  }
  if (patch.is_default) {
    await query('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [userId])
    sets.push('is_default = 1')
  }
  if (!sets.length) throw Object.assign(new Error('لا تغييرات'), { status: 422 })
  params.push(id, userId)
  await query(`UPDATE customer_addresses SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params)
  const rows = await query(`SELECT ${FIELDS} FROM customer_addresses WHERE id = ?`, [id])
  return rows[0]
}

export async function deleteAddress(id, userId) {
  const cur = await getAddress(id, userId)
  if (!cur) throw Object.assign(new Error('العنوان غير موجود'), { status: 404 })
  await query('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?', [id, userId])
  if (cur.is_default) {
    const [next] = await query('SELECT id FROM customer_addresses WHERE user_id = ? ORDER BY id LIMIT 1', [userId])
    if (next) await query('UPDATE customer_addresses SET is_default = 1 WHERE id = ?', [next.id])
  }
  return { ok: true }
}
