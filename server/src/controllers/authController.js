import { asyncHandler } from '../middleware/errors.js'
import { validate, registerSchema, loginSchema, profileSchema } from '../validation/schemas.js'
import * as users from '../services/userService.js'
import { signToken, authCookieOptions } from '../utils/tokens.js'
import { env } from '../config/env.js'

const setSession = (res, user) =>
  res.cookie(env.authCookie, signToken(user), authCookieOptions())

export const register = [
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { full_name, email, phone, password } = req.validated
    if (await users.findByIdentifier(email) || await users.findByIdentifier(phone)) {
      return res.status(409).json({ error: 'هذا البريد أو الهاتف مسجّل مسبقاً' })
    }
    const user = await users.createUser({ full_name, email, phone, password })
    setSession(res, user)
    res.status(201).json({ user })
  }),
]

export const login = [
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.validated
    const found = await users.findByIdentifier(identifier)
    if (!found || !(await users.verifyPassword(password, found.password_hash))) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' })
    }
    if (!found.is_active) {
      return res.status(403).json({ error: 'هذا الحساب معطّل — تواصل مع الإدارة' })
    }
    const user = await users.getPublicUser(found.id)
    setSession(res, user)
    res.json({ user })
  }),
]

export const logout = (req, res) => {
  res.clearCookie(env.authCookie, { path: '/' })
  res.json({ ok: true })
}

export const me = asyncHandler(async (req, res) => {
  const user = await users.getPublicUser(req.user.id)
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' })
  res.json({ user })
})

export const updateMe = [
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await users.updateProfile(req.user.id, req.validated)
    res.json({ user })
  }),
]
