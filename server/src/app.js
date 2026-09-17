import express from 'express'
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

  app.use((_req, res) => res.status(404).json({ error: 'غير موجود' }))
  app.use(errorHandler)
  return app
}
