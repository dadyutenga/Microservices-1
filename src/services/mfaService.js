import createError from 'http-errors'
import { authenticator } from 'otplib'
import pool from '../db/pool.js'

export const enableTotp = async ({ userId, secret }) => {
  await pool.query(
    `INSERT INTO mfa_secrets (user_id, type, secret_enc, enabled, created_at)
     VALUES ($1, 'totp', $2, true, now())
     ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc, enabled = true, updated_at = now()`
    , [userId, secret]
  )
}

export const generateTotpSecret = () => authenticator.generateSecret()

export const verifyTotp = async ({ userId, token }) => {
  const { rows } = await pool.query('SELECT secret_enc FROM mfa_secrets WHERE user_id = $1 AND type = $2 AND enabled = true', [userId, 'totp'])
  if (rows.length === 0) {
    throw createError(400, 'MFA not enabled', { code: 'MFA_NOT_ENABLED' })
  }
  const secret = rows[0].secret_enc
  const valid = authenticator.check(token, secret)
  if (!valid) {
    throw createError(422, 'Invalid MFA token', { code: 'OTP_INVALID' })
  }
  return true
}

export default {
  enableTotp,
  generateTotpSecret,
  verifyTotp
}
