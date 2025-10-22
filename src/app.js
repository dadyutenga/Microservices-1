import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import createError from 'http-errors'
import requestId from './middlewares/requestId.js'
import authRoutes from './routes/auth.routes.js'
import otpRoutes from './routes/otp.routes.js'
import mfaRoutes from './routes/mfa.routes.js'
import recoveryRoutes from './routes/recovery.routes.js'
import rolesRoutes from './routes/roles.routes.js'
import statusRoutes from './routes/status.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import { metricsHandler, httpRequestDuration } from './metrics/index.js'
import { liveness, readiness } from './health/index.js'
import config from './config/index.js'

const app = express()

const corsOptions = config.allowedOrigins.length
  ? {
      origin: (origin, callback) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  : { origin: true }

app.use(requestId)
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors(corsOptions))
app.use(morgan('combined'))

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer()
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status_code: res.statusCode })
  })
  next()
})

app.get('/healthz', liveness)
app.get('/readyz', readiness)
app.get('/metrics', metricsHandler)

app.use('/v1', authRoutes)
app.use('/v1/otp', otpRoutes)
app.use('/v1/mfa', mfaRoutes)
app.use('/v1/recovery', recoveryRoutes)
app.use('/v1/roles', rolesRoutes)
app.use('/v1/status', statusRoutes)
app.use('/v1/analytics', analyticsRoutes)

app.use((req, res, next) => {
  next(createError(404, 'Not Found', { code: 'NOT_FOUND' }))
})

app.use((err, req, res, next) => {
  const status = err.status || 500
  res.status(status).json({
    code: err.code || (status >= 500 ? 'SERVER_ERROR' : 'ERROR'),
    message: err.message
  })
})

export default app
