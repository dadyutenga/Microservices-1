import { v4 as uuid } from 'uuid'
import createError from 'http-errors'
import pool from '../db/pool.js'
import config from '../config/index.js'
import { signAccessToken, signRefreshToken, verifyToken as verifyJwt } from '../utils/jwt.js'
import { hashToken } from '../utils/crypto.js'
import { permissionsFromRoles } from '../utils/permissions.js'
import roleService from './roleService.js'

export const createSession = async ({ userId, roles = [], permissions, scope, ip, ua }) => {
  const sessionId = uuid()
  const effectivePermissions = permissions || permissionsFromRoles(roles)
  const { token: accessToken, jti: accessJti } = signAccessToken({ sub: userId, roles, permissions: effectivePermissions, scope, sid: sessionId })
  const { token: refreshToken, jti: refreshJti } = signRefreshToken({ sub: userId, roles, permissions: effectivePermissions, scope, sid: sessionId })

  const tokenHash = hashToken(refreshToken)
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, issued_at, expires_at, ip, ua)
     VALUES ($1, $2, $3, now(), now() + $4::interval, $5, $6)`
    , [refreshJti, userId, tokenHash, config.jwt.refreshInterval, ip, ua]
  )

  return {
    accessToken,
    refreshToken,
    sessionId,
    accessJti,
    refreshJti,
    roles,
    permissions: effectivePermissions
  }
}

export const rotateRefreshToken = async ({ refreshToken, ip, ua }) => {
  let decoded
  try {
    decoded = verifyJwt(refreshToken)
  } catch (err) {
    throw createError(401, 'Invalid refresh token', { code: 'UNAUTHORIZED' })
  }

  const tokenHash = hashToken(refreshToken)
  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL',
    [decoded.jti, tokenHash]
  )
  if (rows.length === 0) {
    throw createError(401, 'Refresh token revoked', { code: 'UNAUTHORIZED' })
  }

  const { user_id: userId } = rows[0]
  const sessionId = decoded.sid
  const roles = await roleService.getRolesForUser(userId)
  const effectiveRoles = roles.length ? roles : (decoded.roles || [])
  const permissions = permissionsFromRoles(effectiveRoles)
  const scope = decoded.scope

  const { token: newAccessToken, jti: newAccessJti } = signAccessToken({ sub: userId, roles: effectiveRoles, permissions, scope, sid: sessionId })
  const { token: newRefreshToken, jti: newRefreshJti } = signRefreshToken({ sub: userId, roles: effectiveRoles, permissions, scope, sid: sessionId })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE refresh_tokens SET revoked_at = now(), rotated_from = $1 WHERE id = $2', [decoded.jti, decoded.jti])
    await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, issued_at, expires_at, rotated_from, ip, ua)
       VALUES ($1, $2, $3, now(), now() + $4::interval, $5, $6, $7)`
      , [newRefreshJti, userId, hashToken(newRefreshToken), config.jwt.refreshInterval, decoded.jti, ip, ua]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionId,
    accessJti: newAccessJti,
    refreshJti: newRefreshJti,
    roles: effectiveRoles,
    permissions
  }
}

export const revokeRefreshToken = async (tokenId) => {
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [tokenId])
}

export const revokeAllTokensForUser = async (userId) => {
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId])
}

export const revokeByToken = async (refreshToken) => {
  let decoded
  try {
    decoded = verifyJwt(refreshToken)
  } catch (err) {
    throw createError(401, 'Invalid refresh token', { code: 'UNAUTHORIZED' })
  }
  const tokenHash = hashToken(refreshToken)
  const { rowCount } = await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND token_hash = $2', [decoded.jti, tokenHash])
  if (rowCount === 0) {
    throw createError(401, 'Refresh token revoked', { code: 'UNAUTHORIZED' })
  }
  return decoded
}

export const verify = (token) => verifyJwt(token)

export default {
  createSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllTokensForUser,
  revokeByToken,
  verify
}
