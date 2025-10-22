import { Router } from 'express'
import * as mfaController from '../controllers/mfa.controller.js'
import authMiddleware from '../middlewares/auth.js'

const router = Router()

router.post('/verify', authMiddleware(true), mfaController.verifyMfa)

export default router
