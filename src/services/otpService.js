import createError from 'http-errors'
import { randomInt } from 'node:crypto'
import pool from '../db/pool.js'
import { hashToken as hashOtp, constantTimeEqual } from '../utils/crypto.js'
import createEmailProvider from '../providers/email/index.js'
import createSmsProvider from '../providers/sms/index.js'

const emailProvider = createEmailProvider()
const smsProvider = createSmsProvider()

export const generateOtpCode = () => String(randomInt(0, 1000000)).padStart(6, '0')

export const sendOtp = async ({ destination, purpose, channel, userId = null }) => {
  const code = generateOtpCode()
  const codeHash = hashOtp(code)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  const insertQuery = [
    'INSERT INTO otp_codes (id, user_id, destination, channel, code_hash, purpose, expires_at)',
    'VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)'
  ].join(' ')

  await pool.query(insertQuery, [userId, destination, channel, codeHash, purpose, expiresAt])

  if (channel === 'email') {
    const html = '<p>Your code is <strong>' + code + '</strong></p>'
    await emailProvider.send(destination, 'Your verification code', html)
  } else {
    const message = 'Your verification code is ' + code
    await smsProvider.send(destination, message)
  }

  return { expiresAt }
}

export const verifyOtp = async ({ destination, purpose, code }) => {
  const selectQuery = 'SELECT * FROM otp_codes WHERE destination = $1 AND purpose = $2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1'
  const { rows } = await pool.query(selectQuery, [destination, purpose])

  if (rows.length === 0) {
    throw createError(422, 'OTP not found', { code: 'OTP_INVALID' })
  }

  const record = rows[0]
  if (new Date(record.expires_at) < new Date()) {
    throw createError(422, 'OTP expired', { code: 'OTP_INVALID' })
  }

  const providedHash = hashOtp(code)
  if (record.code_hash.length !== providedHash.length || !constantTimeEqual(record.code_hash, providedHash)) {
    await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [record.id])
    throw createError(422, 'OTP invalid', { code: 'OTP_INVALID' })
  }

  await pool.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [record.id])
  return true
}

export default {
  sendOtp,
  verifyOtp
}
