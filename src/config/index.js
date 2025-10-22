import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { ttlToSeconds, ttlToInterval } from '../utils/ttl.js'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile })
} else {
  dotenv.config()
}

const numberFromEnv = (key, fallback) => {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const readKeyIfExists = (filePath) => {
  if (!filePath) return undefined
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) return undefined
  return fs.readFileSync(resolved, 'utf8')
}

const accessTtl = process.env.ACCESS_TTL || '15m'
const refreshTtl = process.env.REFRESH_TTL || '30d'

const gmailUser = process.env.GMAIL_USER
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
const derivedSmtpHost = process.env.SMTP_HOST || (gmailUser ? 'smtp.gmail.com' : undefined)
const derivedSmtpPort = numberFromEnv('SMTP_PORT', gmailUser ? 465 : 587)
const derivedSmtpFrom = process.env.SMTP_FROM || gmailUser
const resolveSmtpSecure = () => {
  if (process.env.SMTP_SECURE !== undefined) {
    return process.env.SMTP_SECURE === 'true'
  }
  return Boolean(gmailUser)
}
const smtpSecure = resolveSmtpSecure()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8001),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwt: {
    algorithm: process.env.JWT_ALG || 'RS256',
    privateKey: process.env.JWT_PRIVATE_KEY || readKeyIfExists(process.env.JWT_PRIVATE_KEY_PATH),
    publicKey: process.env.JWT_PUBLIC_KEY || readKeyIfExists(process.env.JWT_PUBLIC_KEY_PATH),
    accessTtl,
    refreshTtl,
    accessTtlSeconds: ttlToSeconds(accessTtl) || 900,
    refreshTtlSeconds: ttlToSeconds(refreshTtl) || 2592000,
    refreshInterval: ttlToInterval(refreshTtl) || '2592000 seconds'
  },
  providers: {
    email: process.env.PROVIDER_EMAIL || 'SMTP',
    sms: process.env.PROVIDER_SMS || 'TWILIO'
  },
  smtp: {
    host: derivedSmtpHost,
    port: derivedSmtpPort,
    user: process.env.SMTP_USER || gmailUser,
    pass: process.env.SMTP_PASS || gmailAppPassword,
    from: derivedSmtpFrom,
    secure: smtpSecure
  },
  twilio: {
    sid: process.env.TWILIO_SID,
    authToken: process.env.TWILIO_AUTH,
    from: process.env.TWILIO_FROM
  },
  africasTalking: {
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME,
    from: process.env.AFRICASTALKING_FROM
  },
  rateLimit: {
    loginPerMinute: numberFromEnv('RATE_LIMIT_LOGIN_PER_MIN', 5),
    registerPerMinute: numberFromEnv('RATE_LIMIT_REGISTER_PER_MIN', 3)
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)
}

if (!config.databaseUrl) {
  console.warn('DATABASE_URL is not set; database features will be unavailable')
}

if (!config.redisUrl) {
  console.warn('REDIS_URL is not set; rate limiting and OTP flows will be unavailable')
}

export default config
