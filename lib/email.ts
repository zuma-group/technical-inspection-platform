import nodemailer from 'nodemailer'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

export function getSmtpConfigFromEnv(): SmtpConfig {
  const host = process.env.SMTP_HOST || ''
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = port === 465 || process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || ''

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM')
  }

  return { host, port, secure, user, pass, from }
}

export async function sendEmailWithPdf(options: {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  pdf: { filename: string; content: Buffer }
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}, smtp?: SmtpConfig) {
  const cfg = smtp ?? getSmtpConfigFromEnv()

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  })

  const info = await transporter.sendMail({
    from: cfg.from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: [
      {
        filename: options.pdf.filename,
        content: options.pdf.content,
        contentType: 'application/pdf'
      }
    ]
  })

  return info
}


