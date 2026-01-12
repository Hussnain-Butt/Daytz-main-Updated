// File: src/handlers/reportHandlers.ts
// Handlers for story report functionality

import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import moment from 'moment-timezone'
import EmailService from '../services/external/EmailService'
import { SubmitReportRequest, ReportReason, ReportEmailData } from '../types/Report'

const emailService = new EmailService()

/**
 * Handler for submitting a story report
 * POST /api/reports/submit
 */
export const submitReportHandler = async (req: Request, res: Response) => {
  // Validate request body
  await body('reportedUserId').notEmpty().isString().run(req)
  await body('reportedVideoId').isInt({ min: 1 }).run(req)
  await body('reportReason').notEmpty().isString().run(req)
  await body('date').notEmpty().isString().run(req)

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    })
  }

  try {
    const { reportedUserId, reportedVideoId, reportReason, date } = req.body as SubmitReportRequest

    // Extract reporting user ID from JWT (set by extractUserId middleware)
    const reportingUserId = (req as any).userId
    if (!reportingUserId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    // Validate report reason is one of the allowed values
    const validReasons = Object.values(ReportReason)
    if (!validReasons.includes(reportReason as ReportReason)) {
      return res.status(400).json({
        message: 'Invalid report reason',
        validReasons,
      })
    }

    // Get current time in PST timezone
    const reportTimePST = moment().tz('America/Los_Angeles').format('YYYY-MM-DD hh:mm:ss A')

    // Prepare email data
    const emailData: ReportEmailData = {
      reportedUserId,
      reportingUserId,
      reportReason,
      reportedVideoId,
      reportDate: date,
      reportTime: reportTimePST,
    }

    // Send report email
    await emailService.sendReportEmail(emailData)

    console.log(`[ReportHandlers] Report submitted successfully by user ${reportingUserId}`)

    return res.status(200).json({
      message: 'Report submitted successfully',
      reportId: `${reportingUserId}-${reportedUserId}-${Date.now()}`, // Generate a simple report ID for reference
    })
  } catch (error: any) {
    console.error('[ReportHandlers] Error submitting report:', error)

    // Check if it's an email sending error
    if (error.message?.includes('email')) {
      return res.status(500).json({
        message: 'Failed to send report email. Please try again later.',
      })
    }

    return res.status(500).json({
      message: 'An error occurred while processing your report',
    })
  }
}
