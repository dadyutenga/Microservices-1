import { Router } from 'express'
import * as recoveryController from '../controllers/recovery.controller.js'
import { rateLimit } from '../middlewares/rateLimit.js'

const router = Router()

const recoveryRequestLimiter = rateLimit({ windowSeconds: 3600, max: 5, prefix: 'recovery:request' })

router.post('/request', recoveryRequestLimiter, recoveryController.requestRecovery)
router.post('/confirm', recoveryController.confirmRecovery)

export default router
