import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import authMiddleware from '../middlewares/auth.js'
import { rateLimit } from '../middlewares/rateLimit.js'
import config from '../config/index.js'

const router = Router()

router.post(
  '/register',
  rateLimit({ windowSeconds: 60, max: config.rateLimit.registerPerMinute, prefix: 'rl:register' }),
  authController.register
)

router.post(
  '/login',
  rateLimit({ windowSeconds: 60, max: config.rateLimit.loginPerMinute, prefix: 'rl:login' }),
  authController.login
)

router.post('/token/refresh', authController.refresh)
router.post('/logout', authMiddleware(false), authController.logout)
router.get('/user/activity', authMiddleware(true), authController.userActivity)
router.get('/verify-token', authController.verifyToken)

export default router
