import nodemailer from 'nodemailer'

export const createSmtpProvider = (options = {}) => {
  if (!options.host) {
    const transporter = nodemailer.createTransport({ jsonTransport: true })
    return {
      async send (to, subject, html) {
        console.warn('SMTP host not configured; email to %s captured locally', to)
        await transporter.sendMail({ to, subject, html, from: options.from || 'no-reply@example.com' })
      }
    }
  }

  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure ?? options.port === 465,
    auth: options.user && options.pass ? { user: options.user, pass: options.pass } : undefined
  })

  return {
    async send (to, subject, html) {
      await transporter.sendMail({
        to,
        subject,
        html,
        from: options.from || options.user
      })
    }
  }
}

export default createSmtpProvider
