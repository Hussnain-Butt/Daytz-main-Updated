// ✅ COMPLETE AND FINAL UPDATED CODE
// src/handlers/dateHandlers.ts

import { Response, NextFunction } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import DatesService from '../services/internal/DatesService'
import NotificationService from '../services/internal/NotificationService'
import { CreateDatePayload, DateObject as DateType, DateOutcome } from '../types/Date'
import pool from '../db'
import * as humps from 'humps'

const datesService = new DatesService()
const notificationService = new NotificationService()

console.log('[DateHandler] Services instantiated (Dates, Notification).')

// --- createDateHandler --- (No Changes)
export const createDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const proposerUserId = req.userId
    const payload: CreateDatePayload = req.body
    const { date, time, userTo, romanticRating, sexualRating, friendshipRating } = payload

    if (!proposerUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!date || !userTo || !time) {
      return res.status(400).json({ message: 'Date, time, and userTo are required.' })
    }
    if (
      typeof romanticRating !== 'number' ||
      typeof sexualRating !== 'number' ||
      typeof friendshipRating !== 'number'
    ) {
      return res.status(400).json({ message: 'Valid attraction ratings are required.' })
    }
    if (proposerUserId === userTo)
      return res.status(400).json({ message: 'Cannot propose a date to yourself.' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' })

    const existingDate = await datesService.getDateEntryByUsersAndDate(proposerUserId, userTo, date)
    if (
      existingDate &&
      existingDate.status !== 'cancelled' &&
      existingDate.status !== 'completed'
    ) {
      return res
        .status(409)
        .json({ message: 'An active or pending date already exists for this day.', existingDate })
    }

    try {
      const conflictingDateForRecipient = await datesService.getConfirmedDateAtTimeForUser(
        userTo,
        date,
        time,
      )

      if (conflictingDateForRecipient) {
        const dateWithConflict = await datesService.createDateProposalWithConflict(
          proposerUserId,
          payload,
          conflictingDateForRecipient.dateId,
        )
        await notificationService.sendDateConflictNotification(
          proposerUserId,
          userTo,
          dateWithConflict.dateId,
        )
        return res.status(201).json(dateWithConflict)
      } else {
        const createdDate = await datesService.createFullDateProposal(proposerUserId, payload)
        return res.status(201).json(createdDate)
      }
    } catch (error: any) {
      console.error('[CreateDateHandler] Error during full proposal creation:', error.message)
      if (error.code === 'SCHEDULING_CONFLICT') {
        return res.status(409).json({
          code: error.code,
          message: 'This time is unavailable due to a scheduling conflict.',
        })
      }
      if (error.code === 'NOT_A_MATCH') {
        return res.status(409).json({ code: error.code, message: error.message })
      }
      if (error.code === 'INSUFFICIENT_FUNDS')
        return res.status(402).json({ message: 'Insufficient tokens to express attraction.' })
      if (error.message.includes('unique constraint'))
        return res.status(409).json({ message: 'A conflict occurred. Please try again.' })
      next(error)
    }
  },
)

// --- resolveDateConflictHandler --- (No Changes)
export const resolveDateConflictHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const resolverUserId = req.userId
    const { dateId, conflictingDateId, resolution } = req.body

    if (!resolverUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || !conflictingDateId || !resolution)
      return res.status(400).json({ message: 'Required fields are missing.' })
    if (!['KEEP_ORIGINAL', 'ACCEPT_NEW'].includes(resolution))
      return res.status(400).json({ message: 'Invalid resolution.' })

    try {
      const proposalFromCToB = await datesService.getDateEntryById(dateId)
      const originalDateWithA = await datesService.getDateEntryById(conflictingDateId)

      if (!proposalFromCToB || !originalDateWithA)
        return res.status(404).json({ message: 'Date not found.' })
      if (
        proposalFromCToB.userTo !== resolverUserId ||
        (originalDateWithA.userFrom !== resolverUserId &&
          originalDateWithA.userTo !== resolverUserId)
      ) {
        return res.status(403).json({ message: 'Forbidden.' })
      }

      const userCId = proposalFromCToB.userFrom
      const userAId =
        originalDateWithA.userFrom === resolverUserId
          ? originalDateWithA.userTo
          : originalDateWithA.userFrom

      if (resolution === 'KEEP_ORIGINAL') {
        const declinedDate = await datesService.updateDateEntry(dateId, {
          status: 'declined',
          conflictsWithDateId: null,
        })
        await notificationService.sendDateResponseNotification(
          resolverUserId,
          userCId,
          'DECLINED_UNAVAILABLE',
          dateId,
        )
        res.status(200).json({ message: 'Original plan kept.', date: declinedDate })
      } else if (resolution === 'ACCEPT_NEW') {
        await datesService.updateDateEntry(conflictingDateId, { status: 'needs_rescheduling' })
        const confirmedDate = await datesService.updateDateEntry(dateId, {
          status: 'approved',
          conflictsWithDateId: null,
          userToApproved: true,
        })

        await notificationService.sendDateNeedsReschedulingNotification(
          resolverUserId,
          userAId,
          conflictingDateId,
        )
        await notificationService.sendDateResponseNotification(
          resolverUserId,
          userCId,
          'ACCEPTED',
          dateId,
        )

        res.status(200).json({ message: 'New date accepted.', date: confirmedDate })
      }
    } catch (error) {
      next(error)
    }
  },
)

// --- updateDateHandler --- (✅ THIS IS WHERE THE FIX IS)
export const updateDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const updaterUserId = req.userId
    const dateId = Number(req.params.dateId)
    const { status, date, time, locationMetadata } = req.body

    if (!updaterUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (isNaN(dateId)) return res.status(400).json({ message: 'Valid numeric dateId is required.' })

    try {
      const dateToUpdate = await datesService.getDateEntryById(dateId)
      if (!dateToUpdate) return res.status(404).json({ message: 'Date not found.' })

      if (dateToUpdate.userFrom !== updaterUserId && dateToUpdate.userTo !== updaterUserId) {
        return res.status(403).json({ message: 'Forbidden. You are not a participant.' })
      }

      const updatePayload: Partial<DateType> = {}
      let notificationAction: 'RESPONSE' | 'RESCHEDULE' | null = null
      const otherUserId =
        dateToUpdate.userFrom === updaterUserId ? dateToUpdate.userTo : dateToUpdate.userFrom

      if (date || time || locationMetadata) {
        if (!['approved', 'pending', 'needs_rescheduling'].includes(dateToUpdate.status)) {
          return res.status(400).json({ message: 'This date cannot be modified.' })
        }

        const newDate = date || dateToUpdate.date
        const newTime = time || dateToUpdate.time

        if (newTime) {
          // Check for conflict for the person rescheduling
          const conflictForUpdater = await datesService.getConfirmedDateAtTimeForUser(
            updaterUserId,
            newDate,
            newTime,
            undefined, // client parameter
            dateId, // ✅ Exclude the current date from the check
          )
          if (conflictForUpdater) {
            return res.status(409).json({
              message: 'This time conflicts with another one of your confirmed dates.',
              code: 'SCHEDULING_CONFLICT',
            })
          }

          // Check for conflict for the other person
          const conflictForRecipient = await datesService.getConfirmedDateAtTimeForUser(
            otherUserId,
            newDate,
            newTime,
            undefined, // client parameter
            dateId, // ✅ Exclude the current date from the check
          )
          if (conflictForRecipient) {
            return res.status(409).json({
              message: 'This time is unavailable for the other person.',
              code: 'SCHEDULING_CONFLICT',
            })
          }
        }

        if (date) updatePayload.date = date
        if (time) updatePayload.time = time
        if (locationMetadata) updatePayload.locationMetadata = locationMetadata
        updatePayload.status = 'pending'
        if (updaterUserId === dateToUpdate.userFrom) {
          updatePayload.userFromApproved = true
          updatePayload.userToApproved = false
        } else {
          updatePayload.userToApproved = true
          updatePayload.userFromApproved = false
        }
        notificationAction = 'RESCHEDULE'
      } else if (status && ['approved', 'declined'].includes(status)) {
        if (dateToUpdate.status !== 'pending') {
          return res.status(400).json({ message: 'This date is no longer pending.' })
        }
        const myApprovalFlag =
          updaterUserId === dateToUpdate.userFrom
            ? dateToUpdate.userFromApproved
            : dateToUpdate.userToApproved
        if (myApprovalFlag === true)
          return res.status(403).json({ message: "It's not your turn to respond." })

        if (status === 'declined') {
          updatePayload.status = 'declined'
        } else {
          if (updaterUserId === dateToUpdate.userFrom) updatePayload.userFromApproved = true
          else updatePayload.userToApproved = true

          const otherUserApproved =
            updaterUserId === dateToUpdate.userFrom
              ? dateToUpdate.userToApproved
              : dateToUpdate.userFromApproved
          if (otherUserApproved) {
            updatePayload.status = 'approved'
          }
        }
        notificationAction = 'RESPONSE'
      } else {
        return res.status(400).json({ message: 'No valid update data provided.' })
      }

      const updatedDate = await datesService.updateDateEntry(dateId, updatePayload)
      if (updatedDate && otherUserId) {
        if (notificationAction === 'RESPONSE') {
          await notificationService.sendDateResponseNotification(
            updaterUserId,
            otherUserId,
            updatedDate.status === 'approved' ? 'ACCEPTED' : 'DECLINED',
            dateId,
          )
        } else if (notificationAction === 'RESCHEDULE') {
          await notificationService.sendDateRescheduledNotification(
            updaterUserId,
            otherUserId,
            dateId,
          )
        }
      }
      res.status(200).json(updatedDate)
    } catch (error) {
      next(error)
    }
  },
)

// --- cancelDateHandler --- (No Changes)
export const cancelDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const cancellerUserId = req.userId
    const { dateId } = req.params

    if (!cancellerUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || isNaN(Number(dateId)))
      return res.status(400).json({ message: 'Valid dateId required.' })

    try {
      const dateIdNum = Number(dateId)
      const dateEntry = await datesService.getDateEntryById(dateIdNum)
      if (!dateEntry) return res.status(404).json({ message: 'Date not found.' })
      if (dateEntry.userFrom !== cancellerUserId && dateEntry.userTo !== cancellerUserId) {
        return res.status(403).json({ message: 'Forbidden.' })
      }
      if (['cancelled', 'completed'].includes(dateEntry.status)) {
        return res
          .status(400)
          .json({ message: `Cannot cancel a date that is already ${dateEntry.status}.` })
      }
      const updatedDate = await datesService.updateDateEntry(dateIdNum, { status: 'cancelled' })
      const otherUserId =
        dateEntry.userFrom === cancellerUserId ? dateEntry.userTo : dateEntry.userFrom
      if (otherUserId) {
        await notificationService.sendDateCancelledNotification(
          cancellerUserId,
          otherUserId,
          dateIdNum,
        )
      }
      res.status(200).json(updatedDate)
    } catch (error) {
      next(error)
    }
  },
)

// --- Other handlers --- (No Changes)
export const addDateFeedbackHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const dateId = Number(req.params.dateId)
    const { outcome, notes } = req.body
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (isNaN(dateId)) return res.status(400).json({ message: 'Valid dateId required.' })
    const validOutcomes: DateOutcome[] = ['amazing', 'no_show_cancelled', 'other']
    if (!outcome || !validOutcomes.includes(outcome))
      return res.status(400).json({ message: 'Valid outcome required.' })
    try {
      const dateToUpdate = await datesService.getDateEntryById(dateId)
      if (!dateToUpdate) return res.status(404).json({ message: 'Date not found.' })
      if (dateToUpdate.userFrom !== userId && dateToUpdate.userTo !== userId) {
        return res.status(403).json({ message: 'Forbidden.' })
      }
      const query = `INSERT INTO date_feedback (date_id, user_id, outcome, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (date_id, user_id) DO UPDATE SET outcome = EXCLUDED.outcome, notes = EXCLUDED.notes, created_at = NOW() RETURNING *;`
      const values = [dateId, userId, outcome, notes || null]
      const { rows } = await pool.query(query, values)
      res.status(201).json(humps.camelizeKeys(rows[0]))
    } catch (error) {
      next(error)
    }
  },
)

export const getDateByIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { dateId } = req.params
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || isNaN(Number(dateId)))
      return res.status(400).json({ message: 'Valid dateId required.' })
    try {
      const date = await datesService.getDateEntryByIdWithUserDetails(Number(dateId))
      if (!date) return res.status(404).json({ message: 'Date not found.' })
      if (date.userFrom !== userId && date.userTo !== userId)
        return res.status(404).json({ message: 'Date not found.' })

      const responseData = { ...date, userFrom: date.userFromDetails, userTo: date.userToDetails }
      delete responseData.userFromDetails
      delete responseData.userToDetails
      res.status(200).json(responseData)
    } catch (error) {
      next(error)
    }
  },
)

export const getDateByUserFromUserToAndDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { userFrom, userTo, date } = req.params
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (userId !== userFrom && userId !== userTo)
      return res.status(403).json({ message: 'Forbidden.' })
    const dateEntry = await datesService.getDateEntryByUsersAndDate(userFrom, userTo, date)
    if (!dateEntry) return res.status(404).json({ message: 'Date not found.' })
    res.status(200).json(dateEntry)
  },
)

export const getUpcomingDatesHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    try {
      const dates = await datesService.getUpcomingDatesByUserId(userId)
      res.status(200).json(dates)
    } catch (error) {
      next(error)
    }
  },
)
