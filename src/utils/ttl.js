const UNIT_TO_SECONDS = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400
}

export const ttlToSeconds = (ttl) => {
  if (!ttl) return 0
  const match = String(ttl).match(/^(\d+)([smhd])$/)
  if (!match) return 0
  const [, value, unit] = match
  return Number(value) * UNIT_TO_SECONDS[unit]
}

export const ttlToInterval = (ttl) => {
  const seconds = ttlToSeconds(ttl)
  if (!seconds) return '0 seconds'
  return `${seconds} seconds`
}

export default {
  ttlToSeconds,
  ttlToInterval
}
