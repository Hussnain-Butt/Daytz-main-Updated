// File: src/repository/CalendarDayRepository.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import pool from '../db'
import {
  CalendarDay,
  CreateCalendarDay,
  UpdateCalendarDay,
  StoryQueryResult,
  NearbyVideoData,
} from '../types/CalendarDay'
import * as humps from 'humps'
import moment from 'moment'

// ✅ METERS_IN_A_MILE constant for distance calculation
const METERS_IN_A_MILE = 1609.34

class CalendarDayRepository {
  // ✅✅✅ --- QUERY KO POORI TARAH UPDATE KIYA GAYA HAI --- ✅✅✅
  async findNearbyStoriesByDate(
    date: string,
    loggedInUserId: string,
    loggedInUserLat: number,
    loggedInUserLon: number,
    maxDistanceMiles: number = 200,
  ): Promise<StoryQueryResult[] | null> {
    const query = `
      SELECT
          cd.calendar_id AS "calendarId", 
          cd.user_id AS "userId", 
          cd.date,
          cd.vimeo_uri AS "vimeoUri",
          cd.processing_status AS "processingStatus",
          (u.first_name || ' ' || u.last_name) AS "userName",
          u.profile_picture_url AS "profilePictureUrl",
          u.zipcode,
          (ub.blocker_id IS NOT NULL) AS "isBlocked",
          -- ✅ Yahan hum 'earthdistance' ka istemaal karke miles mein doori nikal rahe hain
          (earth_distance(
              ll_to_earth(u.latitude, u.longitude),
              ll_to_earth($3, $4)
          ) / ${METERS_IN_A_MILE}) as distance
      FROM calendar_day cd
      JOIN users u ON cd.user_id = u.user_id
      LEFT JOIN user_blocks ub ON u.user_id = ub.blocked_id AND ub.blocker_id = $2
      WHERE 
        cd.date::date = $1::date
        AND cd.vimeo_uri IS NOT NULL
        AND cd.processing_status = 'complete'
        AND u.user_id != $2
        AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
        -- ✅ Yeh 'earth_box' query ko tez banata hai (optimisation)
        AND earth_box(ll_to_earth($3, $4), ${
          maxDistanceMiles * METERS_IN_A_MILE
        }) @> ll_to_earth(u.latitude, u.longitude)
        -- ✅ Yeh sahi doori check karta hai
        AND earth_distance(
              ll_to_earth(u.latitude, u.longitude),
              ll_to_earth($3, $4)
          ) <= ${maxDistanceMiles * METERS_IN_A_MILE}
      -- ✅ Sabse zaroori: Doori ke hisaab se sort karna (sabse qareeb pehle)
      ORDER BY
        distance ASC;
    `
    try {
      const { rows } = await pool.query(query, [
        date,
        loggedInUserId,
        loggedInUserLat,
        loggedInUserLon,
      ])
      // ✅ Yahan hum har row ko format kar rahe hain, distance ko string bana rahe hain
      return rows.map((row) => ({
        ...row,
        calendarId: parseInt(row.calendarId, 10),
        date: moment(row.date).format('YYYY-MM-DD'),
        userName: (row.userName || 'User').trim(),
        distance: parseFloat(row.distance).toFixed(2), // distance ko format karke bhejna
      }))
    } catch (error) {
      console.error('Error in findNearbyStoriesByDate:', error)
      return null
    }
  }

  async getCalendarDayById(calendarId: number): Promise<CalendarDay | null> {
    const query = `SELECT * FROM calendar_day WHERE calendar_id = $1`
    try {
      const { rows } = await pool.query(query, [calendarId])
      if (rows.length === 0) return null
      const row = rows[0]
      return humps.camelizeKeys(row) as CalendarDay
    } catch (error) {
      console.error('Error in getCalendarDayById:', error)
      return null
    }
  }

  async updateCalendarDay(calendarId: number, updateData: UpdateCalendarDay): Promise<boolean> {
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        fieldsToUpdate.push(`${humps.decamelize(key)} = $${queryIndex++}`)
        values.push(value)
      }
    })

    if (fieldsToUpdate.length === 0) return true

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(calendarId)
    const query = `UPDATE calendar_day SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE calendar_id = $${queryIndex} RETURNING calendar_id`

    try {
      const result = await pool.query(query, values)
      return (result.rowCount || 0) > 0
    } catch (error) {
      console.error(`Error updating calendar day (ID: ${calendarId}):`, error)
      return false
    }
  }

  async getCalendarDayVideosByDateAndZipCode(
    date: string,
    zipcodeList: string[],
  ): Promise<NearbyVideoData[] | null> {
    const query = `
      SELECT cd.user_id, cd.user_video_url FROM calendar_day cd
      INNER JOIN users u ON cd.user_id = u.user_id
      WHERE cd.date::date = $1::date AND u.zipcode = ANY($2::text[]) AND cd.user_video_url IS NOT NULL;`
    try {
      const { rows } = await pool.query(query, [date, zipcodeList])
      return rows.map((row) => ({ userId: row.user_id, userVideoUrl: row.user_video_url }))
    } catch (error) {
      console.error('Error in getCalendarDayVideosByDateAndZipCode:', error)
      return null
    }
  }

  async createCalendarDay(calendarDay: CreateCalendarDay): Promise<CalendarDay | null> {
    const query = `INSERT INTO calendar_day (user_id, date, user_video_url) VALUES ($1, $2, $3) RETURNING *`
    try {
      const { rows } = await pool.query(query, [
        calendarDay.userId,
        calendarDay.date,
        calendarDay.userVideoUrl,
      ])
      return rows.length > 0 ? (humps.camelizeKeys(rows[0]) as CalendarDay) : null
    } catch (error) {
      console.error('Error in createCalendarDay:', error)
      return null
    }
  }

  async getCalendarDaysByUserId(userId: string): Promise<CalendarDay[]> {
    const query = `SELECT * FROM calendar_day WHERE user_id = $1 ORDER BY date DESC`
    try {
      const { rows } = await pool.query(query, [userId])
      return rows.map((row) => humps.camelizeKeys(row) as CalendarDay)
    } catch (error) {
      console.error('Error in getCalendarDaysByUserId:', error)
      return []
    }
  }

  async getCalendarDayByUserIdAndDate(userId: string, date: string): Promise<CalendarDay | null> {
    const query = `SELECT * FROM calendar_day WHERE user_id = $1 AND date::date = $2::date`
    try {
      const { rows } = await pool.query(query, [userId, date])
      if (rows.length === 0) return null
      return humps.camelizeKeys(rows[0]) as CalendarDay
    } catch (error) {
      console.error('Error in getCalendarDayByUserIdAndDate:', error)
      return null
    }
  }

  async deleteCalendarDay(calendarId: number): Promise<boolean> {
    const query = `DELETE FROM calendar_day WHERE calendar_id = $1`
    try {
      const result = await pool.query(query, [calendarId])
      return (result.rowCount || 0) > 0
    } catch (error) {
      console.error('Error deleting calendar day:', error)
      return false
    }
  }
}

export default CalendarDayRepository
