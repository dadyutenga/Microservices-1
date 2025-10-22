import client from 'prom-client'

client.collectDefaultMetrics()

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5]
})

export const metricsHandler = async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType)
  res.send(await client.register.metrics())
}

export default {
  metricsHandler
}
