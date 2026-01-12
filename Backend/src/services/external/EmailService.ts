// File: src/services/external/EmailService.ts
// Email service using Nodemailer for sending reports

import nodemailer, { Transporter } from 'nodemailer'
import { ReportEmailData } from '../../types/Report'

class EmailService {
  private transporter: Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn(
        'EmailService: SMTP configuration incomplete. Email sending will be disabled.',
      )
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      console.log('EmailService: Nodemailer transporter initialized successfully')
    } catch (error) {
      console.error('EmailService: Error initializing transporter:', error)
    }
  }

  /**
   * Send a report email with user-submitted report details
   */
  async sendReportEmail(reportData: ReportEmailData): Promise<void> {
    if (!this.transporter) {
      const errorMsg = 'EmailService: Transporter not initialized. Cannot send email.'
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    const fromEmail = process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER
    const toEmail = process.env.REPORT_EMAIL_TO

    if (!toEmail) {
      const errorMsg = 'EmailService: REPORT_EMAIL_TO not configured.'
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    const emailSubject = reportData.reportReason
    const emailBody = this.formatReportEmailBody(reportData)

    try {
      const info = await this.transporter.sendMail({
        from: `"Daytz Reports" <${fromEmail}>`,
        to: toEmail,
        subject: emailSubject,
        text: emailBody,
        html: this.formatReportEmailHtml(reportData),
      })

      console.log('EmailService: Report email sent successfully:', info.messageId)
    } catch (error) {
      console.error('EmailService: Error sending report email:', error)
      throw new Error('Failed to send report email')
    }
  }

  /**
   * Format plain text email body
   */
  private formatReportEmailBody(reportData: ReportEmailData): string {
    return `
New User Report Submitted
========================

Reported User ID: ${reportData.reportedUserId}
Reported Video/Image ID: ${reportData.reportedVideoId}
Report Date: ${reportData.reportDate}
Report Time: ${reportData.reportTime} (PST)
Reporting User ID: ${reportData.reportingUserId}

Report Reason: ${reportData.reportReason}

Please review this report as soon as possible.
    `.trim()
  }

  /**
   * Format HTML email body for better appearance
   */
  private formatReportEmailHtml(reportData: ReportEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff6b6b; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #555; }
    .value { color: #000; margin-left: 10px; }
    .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New User Report Submitted</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Reported User ID:</span>
        <span class="value">${reportData.reportedUserId}</span>
      </div>
      <div class="field">
        <span class="label">Reported Video/Image ID:</span>
        <span class="value">${reportData.reportedVideoId}</span>
      </div>
      <div class="field">
        <span class="label">Report Date:</span>
        <span class="value">${reportData.reportDate}</span>
      </div>
      <div class="field">
        <span class="label">Report Time:</span>
        <span class="value">${reportData.reportTime} (PST)</span>
      </div>
      <div class="field">
        <span class="label">Reporting User ID:</span>
        <span class="value">${reportData.reportingUserId}</span>
      </div>
      <div class="field">
        <span class="label">Report Reason:</span>
        <span class="value"><strong>${reportData.reportReason}</strong></span>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated report from Daytz application.</p>
      <p>Please review and take appropriate action.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

export default EmailService
