import statusService from '../services/statusService.js'

export const summary = async (req, res, next) => {
  try {
    const result = await statusService.getStatusSummary()
    res.status(result.healthy ? 200 : 503).json(result)
  } catch (err) {
    next(err)
  }
}

export default {
  summary
}
