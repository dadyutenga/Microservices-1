import recoveryService from '../services/recoveryService.js'
import { recoveryRequestSchema, recoveryConfirmSchema } from '../utils/validators.js'
import config from '../config/index.js'

export const requestRecovery = async (req, res, next) => {
  try {
    const payload = recoveryRequestSchema.parse(req.body)
    const result = await recoveryService.requestRecovery(payload)
    const response = {
      delivered: result.delivered,
      expiresAt: result.expiresAt
    }
    if (config.env === 'development') {
      response.token = result.token
    }
    res.status(202).json(response)
  } catch (err) {
    next(err)
  }
}

export const confirmRecovery = async (req, res, next) => {
  try {
    const payload = recoveryConfirmSchema.parse(req.body)
    const result = await recoveryService.confirmRecovery(payload)
    res.json({
      userId: result.userId,
      roles: result.roles,
      permissions: result.permissions,
      message: 'Password reset successfully'
    })
  } catch (err) {
    next(err)
  }
}

export default {
  requestRecovery,
  confirmRecovery
}
