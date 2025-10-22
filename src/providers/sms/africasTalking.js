export const createAfricasTalkingProvider = (options) => {
  if (!options.apiKey || !options.username) {
    return {
      async send (to, text) {
        console.warn('Africa\'s Talking credentials missing; SMS not sent to %s', to)
      }
    }
  }

  let client

  const ensureClient = async () => {
    if (!client) {
      const africasTalking = await import('africastalking')
      client = africasTalking.default({
        apiKey: options.apiKey,
        username: options.username
      })
    }
    return client
  }

  return {
    async send (to, text) {
      const sdk = await ensureClient()
      await sdk.SMS.send({
        to,
        message: text,
        from: options.from
      })
    }
  }
}

export default createAfricasTalkingProvider
