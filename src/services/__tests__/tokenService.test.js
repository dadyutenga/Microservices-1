import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const decodeJwt = (token) => {
  const [, payload] = token.split('.')
  const json = Buffer.from(payload, 'base64url').toString('utf8')
  return JSON.parse(json)
}

test('createSession ignores caller-supplied permissions that exceed role capabilities', async () => {
  process.env.JWT_ALG = 'HS256'
  process.env.JWT_PRIVATE_KEY = 'test-secret'
  process.env.JWT_PUBLIC_KEY = 'test-secret'
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test'

  const { default: pool } = await import('../../db/pool.js')
  const queryMock = mock.method(pool, 'query', async () => ({ rows: [], rowCount: 1 }))
  const { default: tokenService } = await import('../tokenService.js')

  try {
    const session = await tokenService.createSession({
      userId: 'user-123',
      roles: ['user'],
      permissions: ['status.read', 'users.manage'],
      scope: 'user'
    })

    assert.deepStrictEqual(session.permissions, ['status.read'])

    const accessPayload = decodeJwt(session.accessToken)
    const refreshPayload = decodeJwt(session.refreshToken)

    assert.deepStrictEqual(accessPayload.permissions.sort(), ['status.read'])
    assert.deepStrictEqual(refreshPayload.permissions.sort(), ['status.read'])
  } finally {
    queryMock.mock.restore()
  }
})
