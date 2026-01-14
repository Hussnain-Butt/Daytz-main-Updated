// File: src/handlers/dateMessageHandlers.ts
// Handlers for date messaging feature

import { Request, Response } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import DatesService from '../services/internal/DatesService'
import NotificationService from '../services/internal/NotificationService'
import DateMessageRepository from '../repository/DateMessageRepository'
import { QuickMessageType } from '../types/DateMessage'

const datesService = new DatesService()
const notificationService = new NotificationService()

/**
 * Send a quick message for a date
 * POST /api/dates/:dateId/message
 */
export const sendDateMessageHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { dateId } = req.params
    const userId = req.userId
    const { messageType, includePhoneNumber, phoneNumber } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!dateId || isNaN(Number(dateId))) {
      return res.status(400).json({ message: 'Valid dateId required' })
    }

    // Validate message type
    const validMessages = Object.values(QuickMessageType)
    if (!messageType || !validMessages.includes(messageType)) {
      return res.status(400).json({
        message: 'Invalid message type',
        validTypes: validMessages,
      })
    }

    // Validate phone number if included
    if (includePhoneNumber && !phoneNumber?.trim()) {
      return res.status(400).json({ message: 'Phone number required when includePhoneNumber is true' })
    }

    try {
      const dateIdNum = Number(dateId)

      // 1. Get date details
      const date = await datesService.getDateEntryById(dateIdNum)
      if (!date) {
        return res.status(404).json({ message: 'Date not found' })
      }

      // 2. Verify user is participant
      if (date.userFrom !== userId && date.userTo !== userId) {
        return res.status(403).json({ message: 'You are not a participant of this date' })
      }

      // 3. Only allow messages for approved dates
      if (date.status !== 'approved') {
        return res.status(400).json({
          message: 'Messages can only be sent for confirmed dates',
        })
      }

      // 4. Check if user has already sent a message
      const hasUsed = await DateMessageRepository.hasUserSentMessage(dateIdNum, userId)
      if (hasUsed) {
        return res.status(403).json({
          message: 'You have already used your one-time message for this date',
        })
      }

      // 5. Determine recipient
      const recipientId = date.userFrom === userId ? date.userTo : date.userFrom

      // 6. Send notification
      await notificationService.sendDateMessageNotification(
        userId,
        recipientId,
        dateIdNum,
        messageType,
        includePhoneNumber ? phoneNumber : undefined,
      )

      // 7. Mark message as sent
      await DateMessageRepository.markMessageSent(
        dateIdNum,
        userId,
        messageType,
        includePhoneNumber || false,
      )

      console.log(`[DateMessage] User ${userId} sent message for date ${dateIdNum}`)

      return res.status(200).json({
        message: 'Message sent successfully',
      })
    } catch (error: any) {
      console.error('[DateMessage] Error sending message:', error)
      return res.status(500).json({
        message: 'Failed to send message',
        error: error.message,
      })
    }
  },
)

/**
 * Check if user has used their one-time message for a date
 * GET /api/dates/:dateId/message-status
 */
export const getMessageStatusHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { dateId } = req.params
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!dateId || isNaN(Number(dateId))) {
      return res.status(400).json({ message: 'Valid dateId required' })
    }

    try {
      const dateIdNum = Number(dateId)
      const hasUsed = await DateMessageRepository.hasUserSentMessage(dateIdNum, userId)
      const usageDetails = hasUsed
        ? await DateMessageRepository.getUserMessageForDate(dateIdNum, userId)
        : null

      return res.status(200).json({
        hasUsed,
        usageDetails,
      })
    } catch (error: any) {
      console.error('[DateMessage] Error getting status:', error)
      return res.status(500).json({
        message: 'Failed to get message status',
        error: error.message,
      })
    }
  },
)
