export const createTwilioProvider = (options) => {
  if (!options.sid || !options.authToken) {
    return {
      async send (to, text) {
        console.warn('Twilio credentials missing; SMS not sent to %s', to)
      }
    }
  }

  let client

  const ensureClient = async () => {
    if (!client) {
      const twilio = await import('twilio')
      client = twilio.default(options.sid, options.authToken)
    }
    return client
  }

  return {
    async send (to, text) {
      const twilioClient = await ensureClient()
      await twilioClient.messages.create({
        to,
        from: options.from,
        body: text
      })
    }
  }
}

export default createTwilioProvider
