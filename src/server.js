import http from 'node:http'
import app from './app.js'
import config from './config/index.js'
import log from './utils/logger.js'

const server = http.createServer(app)

server.listen(config.port, () => {
  log.info(`Auth service listening on port ${config.port}`)
})

export default server
