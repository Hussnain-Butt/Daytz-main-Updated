// ✅ COMPLETE AND FINAL UPDATED CODE
// src/services/internal/DatesService.ts

import pool from '../../db'
import { PoolClient } from 'pg'
import { DateObject as DateType, CreateDatePayload, UpcomingDate } from '../../types/Date'
import DatesRepository from '../../repository/DatesRepository'
import AttractionRepository from '../../repository/AttractionRepository'
import AttractionService from './AttractionService'
import UserService from './UserService'
import NotificationService from './NotificationService'

class DatesService {
  private datesRepository: DatesRepository
  private attractionRepository: AttractionRepository
  private attractionService: AttractionService
  private userService: UserService
  private notificationService: NotificationService

  constructor() {
    this.datesRepository = new DatesRepository()
    this.attractionRepository = new AttractionRepository()
    this.attractionService = new AttractionService()
    this.userService = new UserService()
    this.notificationService = new NotificationService()
    console.log('[DatesService] All repositories and services instantiated.')
  }

  async createDateProposalWithConflict(
    proposerUserId: string,
    payload: CreateDatePayload,
    conflictingDateId: number,
  ): Promise<DateType> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const dateEntry = await this.datesRepository.createDateEntry(
        {
          ...payload,
          userFrom: proposerUserId,
          status: 'pending_conflict',
          userFromApproved: true,
          userToApproved: false,
          conflictsWithDateId: conflictingDateId,
        },
        client,
      )
      await client.query('COMMIT')
      return dateEntry
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // ✅ YEH FUNCTION UPDATE KIYA GAYA HAI
  async getConfirmedDateAtTimeForUser(
    userId: string,
    date: string,
    time: string,
    client?: PoolClient,
    dateIdToExclude?: number, // Naya optional parameter
  ): Promise<DateType | null> {
    // Naya parameter aage pass kiya gaya
    return this.datesRepository.getConfirmedDateAtTimeForUser(
      userId,
      date,
      time,
      client,
      dateIdToExclude,
    )
  }

  async createFullDateProposal(
    proposerUserId: string,
    payload: CreateDatePayload,
  ): Promise<DateType> {
    const { userTo, date, time } = payload
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      if (time) {
        const conflictingDates = await this.datesRepository.findConflictingDatesForUsers(
          [proposerUserId, userTo],
          date,
          time,
          client,
        )
        if (conflictingDates.length > 0) {
          const error = new Error(
            'Scheduling conflict. The proposed time is too close to another date for one of you.',
          )
          ;(error as any).code = 'SCHEDULING_CONFLICT'
          throw error
        }
      }

      const dateEntry = await this.datesRepository.createDateEntry(
        {
          ...payload,
          userFrom: proposerUserId,
          status: 'pending',
          userFromApproved: true,
          userToApproved: false,
        },
        client,
      )

      await this.notificationService.sendDateProposalNotification(
        proposerUserId,
        userTo,
        {
          dateId: dateEntry.dateId,
          date: dateEntry.date,
          time: dateEntry.time || '',
          venue: dateEntry.locationMetadata?.name || 'A new spot!',
        },
        client,
      )

      await client.query('COMMIT')
      return dateEntry
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[DatesService.createFullDateProposal] Transaction ROLLED BACK. Error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getDateEntryById(dateId: number, client?: PoolClient): Promise<DateType | null> {
    return this.datesRepository.getDateEntryById(dateId, client)
  }

  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    return this.datesRepository.getDateEntryByIdWithUserDetails(dateId)
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
    client?: PoolClient,
  ): Promise<DateType | null> {
    return this.datesRepository.getDateEntryByUsersAndDate(user1, user2, date, client)
  }

  async updateDateEntry(
    dateId: number,
    dateEntry: Partial<DateType>,
    client?: PoolClient,
  ): Promise<DateType | null> {
    return this.datesRepository.updateDateEntry(dateId, dateEntry, client)
  }

  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    return this.datesRepository.getUpcomingDatesByUserId(userId)
  }
}

export default DatesService
