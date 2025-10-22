import pool from '../db/pool.js'

const toInt = value => Number(value) || 0
const toFloat = value => Number.parseFloat(value) || 0

export const getSummary = async ({ window = 7, paymentsWindow = 30 } = {}) => {
  const [totalUsersRes, newUsersRes, activeUsersRes, loginSuccessRes, loginFailureRes, paymentsRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM users'),
    pool.query('SELECT COUNT(*)::int AS count FROM users WHERE created_at >= now() - $1::interval', [`${window} days`]),
    pool.query(
      `SELECT COUNT(DISTINCT user_id)::int AS count
       FROM activity_logs
       WHERE user_id IS NOT NULL
         AND created_at >= now() - $1::interval`,
      [`${window} days`]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM activity_logs
       WHERE action = 'LOGIN_SUCCESS'
         AND created_at >= now() - $1::interval`,
      [`${window} days`]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM activity_logs
       WHERE action = 'LOGIN_FAILURE'
         AND created_at >= now() - $1::interval`,
      [`${window} days`]
    ),
    pool.query(
      `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_amount,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          COUNT(*)::int AS total_count
       FROM payments
       WHERE created_at >= now() - $1::interval`,
      [`${paymentsWindow} days`]
    )
  ])

  return {
    totals: {
      users: toInt(totalUsersRes.rows[0]?.count),
      newUsers: toInt(newUsersRes.rows[0]?.count),
      activeUsers: toInt(activeUsersRes.rows[0]?.count)
    },
    logins: {
      successes: toInt(loginSuccessRes.rows[0]?.count),
      failures: toInt(loginFailureRes.rows[0]?.count)
    },
    payments: {
      completedAmount: toFloat(paymentsRes.rows[0]?.completed_amount),
      completedCount: toInt(paymentsRes.rows[0]?.completed_count),
      totalCount: toInt(paymentsRes.rows[0]?.total_count),
      windowDays: paymentsWindow
    },
    windowDays: window,
    generatedAt: new Date().toISOString()
  }
}

export const getActivityTimeline = async ({ days = 7 } = {}) => {
  const { rows } = await pool.query(
    `SELECT
        date_trunc('day', created_at) AS bucket,
        COUNT(*)::int AS total_events,
        COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCESS')::int AS login_success,
        COUNT(*) FILTER (WHERE action = 'LOGIN_FAILURE')::int AS login_failure
     FROM activity_logs
     WHERE created_at >= now() - $1::interval
     GROUP BY bucket
     ORDER BY bucket ASC`,
    [`${days} days`]
  )

  const topActionsRes = await pool.query(
    `SELECT action, COUNT(*)::int AS count
     FROM activity_logs
     WHERE created_at >= now() - $1::interval
     GROUP BY action
     ORDER BY count DESC
     LIMIT 10`,
    [`${days} days`]
  )

  return {
    days,
    timeline: rows.map(row => ({
      date: row.bucket instanceof Date ? row.bucket.toISOString() : row.bucket,
      totalEvents: toInt(row.total_events),
      loginSuccess: toInt(row.login_success),
      loginFailure: toInt(row.login_failure)
    })),
    topActions: topActionsRes.rows.map(row => ({
      action: row.action,
      count: toInt(row.count)
    }))
  }
}

export default {
  getSummary,
  getActivityTimeline
}
