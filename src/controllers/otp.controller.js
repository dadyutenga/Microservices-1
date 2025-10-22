import otpService from '../services/otpService.js'
import { otpSendSchema, otpVerifySchema } from '../utils/validators.js'

export const sendOtp = async (req, res, next) => {
  try {
    const payload = otpSendSchema.parse(req.body)
    const channel = payload.destination.includes('@') ? 'email' : 'sms'
    const result = await otpService.sendOtp({ ...payload, channel })
    res.status(201).json({ expiresAt: result.expiresAt })
  } catch (err) {
    next(err)
  }
}

export const verifyOtp = async (req, res, next) => {
  try {
    const payload = otpVerifySchema.parse(req.body)
    await otpService.verifyOtp(payload)
    res.json({ verified: true })
  } catch (err) {
    next(err)
  }
}

export default {
  sendOtp,
  verifyOtp
}
