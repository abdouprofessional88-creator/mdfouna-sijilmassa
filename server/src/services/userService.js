import { query } from '../db/pool.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

const PUBLIC = 'id, full_name, email, phone, role, is_active, created_at'

export async function findByIdentifier(identifier) {
  const rows = await query(
    'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
    [identifier.toLowerCase(), identifier]
  )
  return rows[0] || null
}

export async function createUser({ full_name, email, phone, password }) {
  const password_hash = await hashPassword(password)
  const r = await query(
    'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?,?,?,?)',
    [full_name, email.toLowerCase(), phone, password_hash]
  )
  return getPublicUser(r.insertId)
}

export async function getPublicUser(id) {
  const rows = await query(`SELECT ${PUBLIC} FROM users WHERE id = ?`, [id])
  return rows[0] || null
}

export async function updateProfile(id, { full_name, phone }) {
  await query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [full_name, phone, id])
  return getPublicUser(id)
}

export { verifyPassword }
