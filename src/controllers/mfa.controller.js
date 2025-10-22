import mfaService from '../services/mfaService.js'
import { mfaVerifySchema } from '../utils/validators.js'

export const verifyMfa = async (req, res, next) => {
  try {
    const payload = mfaVerifySchema.parse(req.body)
    if (payload.method !== 'totp') {
      return res.status(501).json({ message: 'Only TOTP supported in this release' })
    }
    await mfaService.verifyTotp({ userId: req.user.id, token: payload.code })
    res.json({ verified: true })
  } catch (err) {
    next(err)
  }
}

export default {
  verifyMfa
}
