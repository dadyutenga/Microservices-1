import pool from '../db/pool.js'
import getRedis from '../utils/redis.js'
import config from '../config/index.js'

export const getStatusSummary = async () => {
  const checks = {
    database: { name: 'PostgreSQL', healthy: false },
    redis: config.redisUrl ? { name: 'Redis', healthy: false } : { name: 'Redis', healthy: null }
  }

  try {
    await pool.query('SELECT 1')
    checks.database.healthy = true
  } catch (err) {
    checks.database.error = err.message
  }

  if (config.redisUrl) {
    try {
      const redis = getRedis()
      const pong = await redis.ping()
      checks.redis.healthy = pong === 'PONG'
    } catch (err) {
      checks.redis.healthy = false
      checks.redis.error = err.message
    }
  }

  const overallHealthy = Object.values(checks)
    .filter(entry => entry.healthy !== null)
    .every(entry => entry.healthy)

  return {
    healthy: overallHealthy,
    services: checks,
    timestamp: new Date().toISOString()
  }
}

export default {
  getStatusSummary
}
