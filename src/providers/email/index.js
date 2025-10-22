import config from '../../config/index.js'
import { createSmtpProvider } from './smtp.js'

export const createEmailProvider = () => {
  const provider = (config.providers.email || '').toUpperCase()
  switch (provider) {
    case 'SMTP':
    default:
      return createSmtpProvider(config.smtp)
  }
}

export default createEmailProvider
