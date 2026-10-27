import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function isDemoMode(): boolean {
  return !process.env.SMTP_HOST || !process.env.SMTP_USER
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (isDemoMode()) {
    // Demo mode: log to console
    console.log('\n📧 [MAILER DEMO MODE] Email would be sent:')
    console.log(`  To:      ${options.to}`)
    console.log(`  Subject: ${options.subject}`)
    console.log(`  Preview: ${(options.text || options.html).slice(0, 100)}...`)
    console.log('')
    return
  }

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@civicfix.demo',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: 'Verify your CivicFix account',
    text: `Please verify your email: ${verifyUrl}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #163A63;">Verify your CivicFix account</h2>
        <p>Thank you for registering. Click the button below to verify your email address.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #163A63; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #586779; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="color: #586779; font-size: 12px;">CivicFix is an independent civic-tech platform, not affiliated with any government.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: 'Reset your CivicFix password',
    text: `Reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #163A63;">Reset your password</h2>
        <p>You requested a password reset for your CivicFix account.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #163A63; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #586779; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  })
}

export async function sendReportNotificationEmail(
  email: string,
  reportPublicId: string,
  status: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Update on your CivicFix report ${reportPublicId}`,
    text: `Your report ${reportPublicId} status has changed to: ${status}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #163A63;">Report Update</h2>
        <p>Your report <strong>${reportPublicId}</strong> has been updated.</p>
        <p>New status: <strong>${status.replace('_', ' ')}</strong></p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/report/${reportPublicId}"
          style="display: inline-block; background: #163A63; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          View Report
        </a>
      </div>
    `,
  })
}
