import { v4 as uuid } from 'uuid'

export const requestIdMiddleware = (req, res, next) => {
  const existing = req.headers['x-request-id']
  const requestId = existing || uuid()
  req.id = requestId
  res.setHeader('x-request-id', requestId)
  next()
}

export default requestIdMiddleware
