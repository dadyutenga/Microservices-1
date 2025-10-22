import { Router } from 'express'
import * as otpController from '../controllers/otp.controller.js'
import { rateLimit } from '../middlewares/rateLimit.js'

const router = Router()

router.post('/send', rateLimit({ windowSeconds: 300, max: 3, prefix: 'rl:otp:send' }), otpController.sendOtp)
router.post('/verify', otpController.verifyOtp)

export default router
