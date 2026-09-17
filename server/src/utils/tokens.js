import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret)

export const authCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd, // HTTPS only in production
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
})
