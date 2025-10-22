import config from '../../config/index.js'
import { createTwilioProvider } from './twilio.js'
import { createAfricasTalkingProvider } from './africasTalking.js'

export const createSmsProvider = () => {
  const provider = (config.providers.sms || '').toUpperCase()
  switch (provider) {
    case 'AFRICAS_TALKING':
      return createAfricasTalkingProvider(config.africasTalking)
    case 'TWILIO':
    default:
      return createTwilioProvider(config.twilio)
  }
}

export default createSmsProvider
