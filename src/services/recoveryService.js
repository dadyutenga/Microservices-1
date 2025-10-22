import createError from 'http-errors'
import pool from '../db/pool.js'
import { hashPassword } from '../utils/crypto.js'
import otpService from './otpService.js'
import roleService from './roleService.js'
import { permissionsFromRoles } from '../utils/permissions.js'
import { recordActivity } from './authService.js'

export const requestRecovery = async ({ emailOrPhone }) => {
  const { rows } = await pool.query(
    'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $1 LIMIT 1',
    [emailOrPhone]
  )

  if (rows.length === 0) {
    // Avoid leaking existence information
    return { delivered: false }
  }

  const user = rows[0]
  const trimmed = emailOrPhone.trim()
  const normalizedEmail = user.email ? user.email.toLowerCase() : null
  const isEmail = normalizedEmail && normalizedEmail === trimmed.toLowerCase()
  const destination = isEmail ? user.email : user.phone

  if (!destination) {
    // Should not happen because the query matched either email or phone
    return { delivered: false }
  }

  const channel = isEmail ? 'email' : 'sms'
  const { expiresAt } = await otpService.sendOtp({
    userId: user.id,
    destination,
    purpose: 'recovery',
    channel
  })

  return { delivered: true, expiresAt }
}

export const confirmRecovery = async ({ emailOrPhone, tokenOrOtp, newPassword }) => {
  const { rows } = await pool.query(
    'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $1 LIMIT 1',
    [emailOrPhone]
  )

  if (rows.length === 0) {
    throw createError(404, 'Account not found', { code: 'ACCOUNT_NOT_FOUND' })
  }

  const user = rows[0]
  const trimmed = emailOrPhone.trim()
  const normalizedEmail = user.email ? user.email.toLowerCase() : null
  const isEmail = normalizedEmail && normalizedEmail === trimmed.toLowerCase()
  const destination = isEmail ? user.email : user.phone

  if (!destination) {
    throw createError(422, 'Recovery destination unavailable', { code: 'RECOVERY_UNAVAILABLE' })
  }

  await otpService.verifyOtp({ destination, purpose: 'recovery', code: tokenOrOtp })

  const passwordHash = await hashPassword(newPassword)
  await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, user.id])

  await recordActivity({ userId: user.id, action: 'PASSWORD_RECOVERY_SUCCESS' })

  const roles = await roleService.getRolesForUser(user.id)
  const permissions = permissionsFromRoles(roles)

  return { userId: user.id, roles, permissions }
}

export default {
  requestRecovery,
  confirmRecovery
}
