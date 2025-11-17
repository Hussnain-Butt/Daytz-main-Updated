// ✅ COMPLETE AND FINAL UPDATED CODE
// src/repository/DatesRepository.ts

import pool from '../db'
import { DateObject as DateType, CreateDateInternal, UpcomingDate } from '../types/Date'
import { PoolClient } from 'pg'
import * as humps from 'humps'

// Helper function remains the same
const mapRowToDate = (row: any): DateType | null => {
  if (!row) return null
  const camelized = humps.camelizeKeys(row)
  return {
    dateId: camelized.dateId,
    date: camelized.date,
    time: camelized.time,
    userFrom: camelized.userFrom,
    userTo: camelized.userTo,
    userFromApproved: camelized.userFromApproved,
    userToApproved: camelized.userToApproved,
    locationMetadata: camelized.locationMetadata,
    status: camelized.status,
    conflictsWithDateId: camelized.conflictsWithDateId,
    createdAt: camelized.createdAt,
    updatedAt: camelized.updatedAt,
  }
}

class DatesRepository {
  async findConflictingDatesForUsers(
    userIds: string[],
    date: string,
    time: string,
    client: PoolClient | null = null,
  ): Promise<DateType[]> {
    const db = client || pool
    const query = `
      SELECT * FROM dates
      WHERE 
        date::date = $1::date
        AND (user_from = ANY($2::text[]) OR user_to = ANY($2::text[]))
        AND status IN ('pending', 'approved')
        AND ($3::time) BETWEEN (time - INTERVAL '30 minutes') AND (time + INTERVAL '30 minutes');
    `
    const { rows } = await db.query(query, [date, userIds, time])
    return rows.map(mapRowToDate).filter((d): d is DateType => d !== null)
  }

  // ✅ YEH FUNCTION UPDATE KIYA GAYA HAI
  async getConfirmedDateAtTimeForUser(
    userId: string,
    date: string,
    time: string,
    client: PoolClient | null = null,
    dateIdToExclude: number | null = null, // Naya parameter add kiya gaya hai
  ): Promise<DateType | null> {
    const db = client || pool
    let query = `
      SELECT * FROM dates
      WHERE
        (user_from = $1 OR user_to = $1)
        AND date::date = $2::date
        AND time = $3::time
        AND status = 'approved'
    `
    const values: any[] = [userId, date, time]

    // Agar dateIdToExclude hai, to use query mein add karo
    if (dateIdToExclude) {
      query += ` AND date_id != $4`
      values.push(dateIdToExclude)
    }

    query += ` LIMIT 1;`
    const { rows } = await db.query(query, values)
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async createDateEntry(
    dateEntry: CreateDateInternal,
    client: PoolClient | null = null,
  ): Promise<DateType> {
    const db = client || pool
    const query = `INSERT INTO dates (date, time, user_from, user_to, user_from_approved, user_to_approved, location_metadata, status, conflicts_with_date_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`
    const values = [
      dateEntry.date,
      dateEntry.time,
      dateEntry.userFrom,
      dateEntry.userTo,
      dateEntry.userFromApproved,
      dateEntry.userToApproved,
      dateEntry.locationMetadata ? JSON.stringify(dateEntry.locationMetadata) : null,
      dateEntry.status,
      dateEntry.conflictsWithDateId || null,
    ]
    const { rows } = await db.query(query, values)
    const newDate = mapRowToDate(rows[0])
    if (!newDate) {
      throw new Error('Date creation failed, repository did not return a date object.')
    }
    return newDate
  }

  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    const query = `
      SELECT 
        d.*,
        json_build_object('userId', uf.user_id, 'firstName', uf.first_name, 'profilePictureUrl', uf.profile_picture_url, 'videoUrl', uf.video_url) as "user_from_details",
        json_build_object('userId', ut.user_id, 'firstName', ut.first_name, 'profilePictureUrl', ut.profile_picture_url) as "user_to_details"
      FROM dates d
      JOIN users uf ON d.user_from = uf.user_id
      JOIN users ut ON d.user_to = ut.user_id
      WHERE d.date_id = $1;
    `
    const { rows } = await pool.query(query, [dateId])
    if (rows.length === 0) return null
    return humps.camelizeKeys(rows[0])
  }

  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    const query = `
      SELECT
        d.date_id as "dateId", 
        d.date, 
        d.time,
        d.status,
        d.updated_at as "updatedAt",
        d.conflicts_with_date_id as "conflictsWithDateId",
        d.location_metadata as "locationMetadata",
        d.user_from as "userFrom",
        d.user_to as "userTo",
        d.user_from_approved as "userFromApproved",
        d.user_to_approved as "userToApproved",
        feedback.outcome AS "myOutcome",
        feedback.notes AS "myNotes",
        CASE
          WHEN d.user_from = $1 THEN 
            json_build_object('userId', ut.user_id, 'firstName', ut.first_name, 'profilePictureUrl', ut.profile_picture_url)
          ELSE 
            json_build_object('userId', uf.user_id, 'firstName', uf.first_name, 'profilePictureUrl', uf.profile_picture_url)
        END as "otherUser"
      FROM dates d
      JOIN users uf ON d.user_from = uf.user_id
      JOIN users ut ON d.user_to = ut.user_id
      LEFT JOIN date_feedback AS feedback ON feedback.date_id = d.date_id AND feedback.user_id = $1
      WHERE (d.user_from = $1 OR d.user_to = $1)
      AND d.status NOT IN ('cancelled', 'declined', 'completed')
      ORDER BY d.date DESC, d.time DESC;
    `
    const { rows } = await pool.query(query, [userId])
    return rows.map((row) => humps.camelizeKeys(row)) as UpcomingDate[]
  }

  async getDateEntryById(
    dateId: number,
    client: PoolClient | null = null,
  ): Promise<DateType | null> {
    const db = client || pool
    const query = `SELECT * FROM dates WHERE date_id = $1`
    const { rows } = await db.query(query, [dateId])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
    client: PoolClient | null = null,
  ): Promise<DateType | null> {
    const db = client || pool
    const query = `SELECT * FROM dates WHERE ((user_from = $1 AND user_to = $2) OR (user_from = $2 AND user_to = $1)) AND date = $3`
    const { rows } = await db.query(query, [user1, user2, date])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async updateDateEntry(
    dateId: number,
    dateEntry: Partial<DateType>,
    client: PoolClient | null = null,
  ): Promise<DateType | null> {
    const db = client || pool
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1
    Object.entries(dateEntry).forEach(([key, value]) => {
      if (value !== undefined && key !== 'dateId') {
        const snakeCaseKey = humps.decamelize(key)
        fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex}`)
        values.push(key === 'locationMetadata' ? JSON.stringify(value) : value)
        queryIndex++
      }
    })
    if (fieldsToUpdate.length === 0) return this.getDateEntryById(dateId, client)

    values.push(dateId)
    const query = `UPDATE dates SET ${fieldsToUpdate.join(
      ', ',
    )}, updated_at = NOW() WHERE date_id = $${queryIndex} RETURNING *`
    const { rows } = await db.query(query, values)
    return rows.length ? mapRowToDate(rows[0]) : null
  }
}

export default DatesRepository
