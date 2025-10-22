import createError from 'http-errors'
import authService from '../services/authService.js'
import tokenService from '../services/tokenService.js'
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../utils/validators.js'
import config from '../config/index.js'

export const register = async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body)
    const result = await authService.register(payload, { ip: req.ip, ua: req.headers['user-agent'] })
    res.status(201).json({ userId: result.id, emailSent: true, smsSent: Boolean(payload.phone) })
  } catch (err) {
    next(err)
  }
}

export const login = async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body)
    const result = await authService.login(payload, { ip: req.ip, ua: req.headers['user-agent'] })
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
      expiresIn: config.jwt.accessTtlSeconds
    })
  } catch (err) {
    next(err)
  }
}

export const refresh = async (req, res, next) => {
  try {
    const payload = refreshSchema.parse(req.body)
    const result = await authService.refresh(payload, { ip: req.ip, ua: req.headers['user-agent'] })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export const logout = async (req, res, next) => {
  try {
    const payload = logoutSchema.parse(req.body)
    await authService.logout(payload, {
      ip: req.ip,
      ua: req.headers['user-agent'],
      tokenId: req.user?.tokenId,
      userId: req.user?.id
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export const userActivity = async (req, res, next) => {
  try {
    const { rows } = await authService.getActivityForUser(req.user.id, req.query.limit || 20)
    res.json({ items: rows })
  } catch (err) {
    next(err)
  }
}

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.query.token
    if (!token) {
      throw createError(400, 'token required', { code: 'VALIDATION_ERROR' })
    }
    const decoded = tokenService.verify(token)
    res.json({ valid: true, sub: decoded.sub, roles: decoded.roles, scope: decoded.scope, exp: decoded.exp })
  } catch (err) {
    if (err.status) {
      next(err)
    } else {
      res.status(200).json({ valid: false })
    }
  }
}

export default {
  register,
  login,
  refresh,
  logout,
  userActivity,
  verifyToken
}
