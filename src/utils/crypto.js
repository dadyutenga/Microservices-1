import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12

export const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS)

export const verifyPassword = async (password, hash) => bcrypt.compare(password, hash)

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

export const generateToken = (length = 48) => crypto.randomBytes(length).toString('base64url')

export const constantTimeEqual = (a, b) => {
  const aBuf = Buffer.from(a, 'hex')
  const bBuf = Buffer.from(b, 'hex')
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export default {
  hashPassword,
  verifyPassword,
  hashToken,
  generateToken,
  constantTimeEqual
}
