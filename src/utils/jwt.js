import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import config from '../config/index.js'

const isSymmetric = config.jwt.algorithm.startsWith('HS')

const signingKey = isSymmetric ? (config.jwt.privateKey || 'dev-secret') : config.jwt.privateKey
const verifyingKey = isSymmetric ? (config.jwt.privateKey || 'dev-secret') : config.jwt.publicKey

if (!signingKey) {
  console.warn('JWT signing key missing; tokens cannot be issued')
}

export const signAccessToken = (payload, opts = {}) => {
  if (!signingKey) throw new Error('Signing key missing')
  const jti = uuid()
  return {
    token: jwt.sign({ ...payload, jti }, signingKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.accessTtl,
      issuer: 'auth-service',
      audience: 'auth-clients',
      ...opts
    }),
    jti
  }
}

export const signRefreshToken = (payload, opts = {}) => {
  if (!signingKey) throw new Error('Signing key missing')
  const jti = uuid()
  return {
    token: jwt.sign({ ...payload, jti }, signingKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.refreshTtl,
      issuer: 'auth-service',
      audience: 'auth-clients',
      ...opts
    }),
    jti
  }
}

export const verifyToken = (token, opts = {}) => {
  if (!verifyingKey) throw new Error('Verifying key missing')
  return jwt.verify(token, verifyingKey, {
    algorithms: [config.jwt.algorithm],
    issuer: 'auth-service',
    audience: 'auth-clients',
    clockTolerance: 30,
    ...opts
  })
}

export default {
  signAccessToken,
  signRefreshToken,
  verifyToken
}
