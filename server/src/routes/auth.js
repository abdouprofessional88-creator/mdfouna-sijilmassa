import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as auth from '../controllers/authController.js'

const r = Router()

r.post('/register', ...auth.register)
r.post('/login', ...auth.login)
r.post('/logout', auth.logout)
r.get('/me', requireAuth, auth.me)
r.patch('/me', requireAuth, ...auth.updateMe)

export default r
