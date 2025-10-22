import { Router } from 'express'
import createError from 'http-errors'
import * as statusController from '../controllers/status.controller.js'
import authMiddleware from '../middlewares/auth.js'

const router = Router()

router.get('/summary', authMiddleware(false), (req, res, next) => {
  if (req.user && !req.user.permissions.includes('status.read')) {
    return next(createError(403, 'Forbidden', { code: 'FORBIDDEN' }))
  }
  return statusController.summary(req, res, next)
})

export default router
