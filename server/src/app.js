import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import authRoutes from './routes/auth.js'
import apiRoutes from './routes/api.js'
import staffRoutes from './routes/staff.js'
import deliveryRoutes from './routes/delivery.js'
import paymentRoutes from './routes/payments.js'
import { errorHandler } from './middleware/errors.js'
import { authLimiter, writeLimiter } from './middleware/rateLimit.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientOrigins, credentials: true }))
  // webhook needs the RAW body for signature verification → mount before json parser
  app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '100kb' }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'sijilmassa-api', time: new Date().toISOString() }))

  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/staff', staffRoutes)
  app.use('/api', writeLimiter, deliveryRoutes)
  app.use('/api', writeLimiter, paymentRoutes)
  app.use('/api', writeLimiter, apiRoutes)

  // Single-service deploy: serve the built frontend (SERVE_FRONTEND=1 + /dist present)
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dist = path.join(here, '..', '..', 'dist')
  if (process.env.SERVE_FRONTEND === '1' && fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(dist, 'index.html'))
    })
  }

  app.use((_req, res) => res.status(404).json({ error: 'غير موجود' }))
  app.use(errorHandler)
  return app
}
