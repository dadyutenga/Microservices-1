import createError from 'http-errors'
import { v4 as uuid } from 'uuid'
import pool from '../db/pool.js'
import { hashToken, hashPassword } from '../utils/crypto.js'
import otpService from './otpService.js'
import roleService from './roleService.js'
import { permissionsFromRoles } from '../utils/permissions.js'
import { recordActivity } from './authService.js'
import createEmailProvider from '../providers/email/index.js'

const emailProvider = createEmailProvider()

const RECOVERY_TOKEN_TTL_MINUTES = 30

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
  const token = uuid()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + RECOVERY_TOKEN_TTL_MINUTES * 60 * 1000)

  await pool.query(
    `INSERT INTO recovery_tokens (id, user_id, token_hash, expires_at)
     VALUES (gen_random_uuid(), $1, $2, $3)`
    , [user.id, tokenHash, expiresAt]
  )

  if (user.email) {
    await otpService.sendOtp({ userId: user.id, destination: user.email, purpose: 'recovery', channel: 'email' })
    const html = '<p>Use the following recovery token to reset your password: <strong>' + token + '</strong></p>'
    await emailProvider.send(user.email, 'Password recovery token', html)
  } else if (user.phone) {
    await otpService.sendOtp({ userId: user.id, destination: user.phone, purpose: 'recovery', channel: 'sms' })
  }

  return { delivered: true, token, expiresAt }
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
  const isOtp = tokenOrOtp.length === 6 && /^\d{6}$/.test(tokenOrOtp)

  if (isOtp) {
    await otpService.verifyOtp({ destination: user.email || user.phone, purpose: 'recovery', code: tokenOrOtp })
  } else {
    const tokenHash = hashToken(tokenOrOtp)
    const { rows: tokenRows } = await pool.query(
      `SELECT id FROM recovery_tokens
       WHERE user_id = $1 AND token_hash = $2 AND consumed_at IS NULL AND expires_at > now()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [user.id, tokenHash]
    )

    if (tokenRows.length === 0) {
      throw createError(422, 'Invalid or expired recovery token', { code: 'TOKEN_INVALID' })
    }

    await pool.query('UPDATE recovery_tokens SET consumed_at = now() WHERE id = $1', [tokenRows[0].id])
  }

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
