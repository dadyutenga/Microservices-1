import createError from 'http-errors'
import { v4 as uuid } from 'uuid'
import pool from '../db/pool.js'
import config from '../config/index.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'
import tokenService from './tokenService.js'
import otpService from './otpService.js'

export const register = async ({ email, phone, password }, context = {}) => {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError(409, 'Email already in use', { code: 'EMAIL_IN_USE' })
  }

  if (phone) {
    const phoneExisting = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (phoneExisting.rows.length > 0) {
      throw createError(409, 'Phone already in use', { code: 'PHONE_IN_USE' })
    }
  }

  const id = uuid()
  const passwordHash = await hashPassword(password)

  await pool.query(
    `INSERT INTO users (id, email, phone, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())`
    , [id, email, phone || null, passwordHash]
  )

  await recordActivity({ userId: id, action: 'REGISTER', ip: context.ip, ua: context.ua })

  await otpService.sendOtp({ destination: email, purpose: 'verify_email', channel: 'email' })
  if (phone) {
    await otpService.sendOtp({ destination: phone, purpose: 'verify_phone', channel: 'sms' })
  }

  return { id }
}

export const login = async ({ emailOrPhone, password }, context = {}) => {
  const { rows } = await pool.query(
    'SELECT id, password_hash, status FROM users WHERE email = $1 OR phone = $1',
    [emailOrPhone]
  )

  if (rows.length === 0) {
    throw createError(401, 'Invalid credentials', { code: 'INVALID_CREDENTIALS' })
  }

  const user = rows[0]
  if (user.status !== 'active') {
    throw createError(403, 'Account not active', { code: 'ACCOUNT_DISABLED' })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    throw createError(401, 'Invalid credentials', { code: 'INVALID_CREDENTIALS' })
  }

  const rolesResult = await pool.query(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`
    , [user.id]
  )
  const roles = rolesResult.rows.map(r => r.name)

  const session = await tokenService.createSession({
    userId: user.id,
    roles,
    scope: 'user',
    ip: context.ip,
    ua: context.ua
  })

  await recordActivity({ userId: user.id, action: 'LOGIN_SUCCESS', ip: context.ip, ua: context.ua })

  return {
    userId: user.id,
    ...session
  }
}

export const refresh = async ({ refreshToken }, context = {}) => {
  const session = await tokenService.rotateRefreshToken({ refreshToken, ip: context.ip, ua: context.ua })
  return session
}

export const logout = async ({ refreshToken }, context = {}) => {
  if (refreshToken) {
    const decoded = await tokenService.revokeByToken(refreshToken)
    await recordActivity({ userId: decoded.sub, action: 'LOGOUT', ip: context.ip, ua: context.ua })
  } else if (context.tokenId) {
    await tokenService.revokeRefreshToken(context.tokenId)
    await recordActivity({ userId: context.userId, action: 'LOGOUT', ip: context.ip, ua: context.ua })
  }
  return true
}

export const recordActivity = async ({ userId, action, ip, ua, metadata }) => {
  await pool.query(
    `INSERT INTO activity_logs (user_id, action, ip, ua, metadata)
     VALUES ($1, $2, $3, $4, $5)`
    , [userId || null, action, ip || null, ua || null, metadata ? JSON.stringify(metadata) : null]
  )
}

export const getActivityForUser = async (userId, limit = 20) => {
  return pool.query(
    `SELECT action, ip, ua, metadata, created_at
     FROM activity_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`
    , [userId, limit]
  )
}

register.config = config
login.config = config

export default {
  register,
  login,
  refresh,
  logout,
  recordActivity,
  getActivityForUser,
  config
}
