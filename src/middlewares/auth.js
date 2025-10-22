import createError from 'http-errors'
import { verifyToken } from '../utils/jwt.js'

export const authMiddleware = (required = true) => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      if (required) {
        return next(createError(401, 'Unauthorized', { code: 'UNAUTHORIZED' }))
      }
      return next()
    }

    try {
      const decoded = verifyToken(token)
      req.user = {
        id: decoded.sub,
        roles: decoded.roles || [],
        scope: decoded.scope,
        sessionId: decoded.sid,
        tokenId: decoded.jti
      }
      return next()
    } catch (err) {
      return next(createError(401, 'Unauthorized', { code: 'UNAUTHORIZED' }))
    }
  }
}

export const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Unauthorized', { code: 'UNAUTHORIZED' }))
    }
    const hasRole = roles.some(role => req.user.roles.includes(role))
    if (!hasRole) {
      return next(createError(403, 'Forbidden', { code: 'FORBIDDEN' }))
    }
    return next()
  }
}

export default authMiddleware
