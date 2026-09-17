import { verifyToken } from '../utils/tokens.js'
import { env } from '../config/env.js'
import { query } from '../db/pool.js'

/** Reads JWT from httpOnly cookie (primary) or Authorization: Bearer (fallback). */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[env.authCookie]
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null)
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' })
  try {
    const payload = verifyToken(token)
    // live activation check so deactivation takes effect immediately
    const rows = await query('SELECT role, is_active FROM users WHERE id = ? LIMIT 1', [payload.sub])
    if (!rows[0]) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' })
    if (!rows[0].is_active) return res.status(403).json({ error: 'هذا الحساب معطّل — تواصل مع الإدارة' })
    req.user = { id: payload.sub, role: rows[0].role }
    next()
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    return res.status(401).json({ error: 'الجلسة منتهية — سجّل الدخول مجدداً' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'صلاحيات غير كافية' })
}
