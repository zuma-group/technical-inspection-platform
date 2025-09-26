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


export function generateEmailContent(inspection: any) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'
  const taskId = (inspection as any).taskId || (inspection as any).equipment?.taskId
  const freightId = (inspection as any).freightId
  const inspectionName = ((inspection as any).template?.name) || 'Quick Inspection'
  const videoLinks: Array<{ filename: string; url: string }> = []
  for (const section of inspection.sections || []) {
    for (const cp of section.checkpoints || []) {
      for (const m of (cp.media || [])) {
        if (m.type === 'video') {
          videoLinks.push({ filename: m.filename, url: `${siteUrl}/api/media/${m.id}` })
        }
      }
    }
  }

  const videosHtml = videoLinks.length
    ? `<h3>Attached Videos</h3><ul>${videoLinks.map(v => `<li><a href="${v.url}">${v.filename}</a></li>`).join('')}</ul>`
    : ''
  const videosText = videoLinks.length
    ? `\nVideos:\n${videoLinks.map(v => `- ${v.filename}: ${v.url}`).join('\n')}`
    : ''

  return {
    subject: (() => {
      const parts: string[] = ['Inspection Report', inspectionName]
      if (freightId) parts.push(`[Freight ${String(freightId)}]`)
      if (taskId) parts.push(`[Task ${String(taskId)}]`)
      parts.push(`${inspection.equipment.model} (${inspection.equipment.serial})`)
      return parts.join(' - ')
    })(),
    html: `
      <h2>Inspection Report</h2>
      <p>Please find the attached inspection report for:</p>
      <ul>
        <li><strong>Equipment:</strong> ${inspection.equipment.model}</li>
        <li><strong>Serial Number:</strong> ${inspection.equipment.serial}</li>
        <li><strong>Inspection Name:</strong> ${inspectionName}</li>
        ${freightId ? `<li><strong>Freight ID:</strong> ${String(freightId)}</li>` : ''}
        ${taskId ? `<li><strong>Task ID:</strong> ${String(taskId)}</li>` : ''}
        <li><strong>Date:</strong> ${require('./time').formatPDTDateTime(inspection.startedAt)}</li>
        <li><strong>Status:</strong> ${inspection.status.replace(/_/g, ' ')}</li>
        <li><strong>Technician:</strong> ${inspection.technician?.name || 'N/A'}</li>
      </ul>
      ${videosHtml}
      <p>This report was generated automatically by the Technical Inspection Platform.</p>
    `,
    text: `Inspection Report - ${inspectionName} - ${inspection.equipment.model} (${inspection.equipment.serial})\nInspection Name: ${inspectionName}${freightId ? `\nFreight ID: ${String(freightId)}` : ''}${taskId ? `\nTask ID: ${String(taskId)}` : ''}\nDate: ${require('./time').formatPDTDateTime(inspection.startedAt)}\n\nPlease find the attached inspection report PDF.${videosText}`,
    filename: `inspection-${inspection.id}.pdf`
  }
}

