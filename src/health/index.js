import pool from '../db/pool.js'
import getRedis from '../utils/redis.js'
import config from '../config/index.js'

export const liveness = (req, res) => {
  res.json({ status: 'ok' })
}

export const readiness = async (req, res) => {
  const checks = {
    postgres: false,
    redis: !config.redisUrl ? null : false
  }

  try {
    await pool.query('SELECT 1')
    checks.postgres = true
  } catch (err) {
    checks.postgres = false
  }

  if (config.redisUrl) {
    try {
      const redis = getRedis()
      await redis.ping()
      checks.redis = true
    } catch (err) {
      checks.redis = false
    }
  }

  const ready = Object.entries(checks)
    .filter(([key, value]) => value !== null)
    .every(([, value]) => Boolean(value))
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks })
}

export default {
  liveness,
  readiness
}
