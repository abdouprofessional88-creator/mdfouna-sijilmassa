/**
 * Tiny in-memory rate limiter (per-IP sliding window).
 * Protects auth + order/reservation creation from brute force & double-submit floods.
 * For multi-instance production, replace with Redis-backed limiter.
 */
const hits = new Map()

export function rateLimit({ windowMs = 10 * 60 * 1000, max = 60 } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
    // count this attempt optimistically; remove it if the request succeeds
    // (only failed attempts consume the budget — successful logins never lock users out)
    arr.push(now)
    hits.set(key, arr)
    res.on('finish', () => {
      if (res.statusCode < 400) {
        const cur = hits.get(key) || []
        cur.shift()
        if (cur.length) hits.set(key, cur)
        else hits.delete(key)
      }
    });
    // occasional cleanup
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.length === 0 || now - v[v.length - 1] > windowMs) hits.delete(k)
      }
    }
    if (arr.length > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
      return res.status(429).json({ error: 'محاولات كثيرة — انتظر قليلاً وحاول مجدداً' })
    }
    next()
  }
}

export const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 60,
})
export const writeLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WRITE_MAX) || 300,
})
