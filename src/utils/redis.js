import Redis from 'ioredis'
import config from '../config/index.js'

let redis

export const getRedis = () => {
  if (!config.redisUrl) {
    throw new Error('Redis URL not configured')
  }
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null
    })

    redis.on('error', (err) => {
      console.error('Redis error', err)
    })
  }
  return redis
}

export default getRedis
