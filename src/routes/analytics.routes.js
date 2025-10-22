import { Router } from 'express'
import analyticsController from '../controllers/analytics.controller.js'
import authMiddleware, { requirePermissions } from '../middlewares/auth.js'

const router = Router()

router.get(
  '/summary',
  authMiddleware(true),
  requirePermissions(['analytics.read']),
  analyticsController.summary
)

router.get(
  '/activity',
  authMiddleware(true),
  requirePermissions(['analytics.read']),
  analyticsController.activity
)

export default router
