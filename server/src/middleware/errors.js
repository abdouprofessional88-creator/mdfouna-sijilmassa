export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** Central error serializer — never leaks stack traces to clients. */
export function errorHandler(err, _req, res, _next) {
  // MySQL duplicate key → friendly 409 (message depends on the constraint)
  if (err?.code === 'ER_DUP_ENTRY') {
    const msg = String(err.message || '')
    if (msg.includes('uq_users_email') || msg.includes('uq_users_phone') || msg.includes('users.email') || msg.includes('users.phone')) {
      return res.status(409).json({ error: 'هذا البريد أو الهاتف مسجّل مسبقاً' })
    }
    return res.status(409).json({ error: 'هذا العنصر مسجّل مسبقاً' })
  }
  const status = err.status || 500
  const body = { error: status === 500 ? 'خطأ داخلي — حاول لاحقاً' : (err.message || 'خطأ') }
  if (err.details) body.details = err.details
  if (status === 500) console.error('[API ERROR]', err)
  res.status(status).json(body)
}
