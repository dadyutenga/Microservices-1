import analyticsService from '../services/analyticsService.js'
import { analyticsSummaryQuerySchema, analyticsActivityQuerySchema } from '../utils/validators.js'

export const summary = async (req, res, next) => {
  try {
    const query = analyticsSummaryQuerySchema.parse(req.query)
    const summary = await analyticsService.getSummary({
      window: query.window ?? 7,
      paymentsWindow: query.paymentsWindow ?? 30
    })
    res.json(summary)
  } catch (err) {
    next(err)
  }
}

export const activity = async (req, res, next) => {
  try {
    const query = analyticsActivityQuerySchema.parse(req.query)
    const timeline = await analyticsService.getActivityTimeline({
      days: query.days ?? 7
    })
    res.json(timeline)
  } catch (err) {
    next(err)
  }
}

export default {
  summary,
  activity
}
