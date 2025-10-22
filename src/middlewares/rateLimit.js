import createError from 'http-errors'
import getRedis from '../utils/redis.js'
import config from '../config/index.js'

const keyFor = (prefix, identifier) => `${prefix}:${identifier}`

export const rateLimit = ({
  windowSeconds,
  max,
  prefix
}) => {
  return async (req, res, next) => {
    if (!config.redisUrl) {
      return next()
    }

    const redis = getRedis()
    const identifier = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    const key = keyFor(prefix, identifier)
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    try {
      await redis.zremrangebyscore(key, 0, windowStart)
      const count = await redis.zcard(key)
      if (count >= max) {
        const ttl = await redis.pttl(key)
        return next(createError(429, 'Too many requests', { code: 'RATE_LIMITED', retryAfter: Math.ceil(ttl / 1000) }))
      }
      await redis.zadd(key, now, `${now}-${Math.random()}`)
      await redis.pexpire(key, windowSeconds * 1000)
      return next()
    } catch (err) {
      return next(err)
    }
  }
}

export default rateLimit
