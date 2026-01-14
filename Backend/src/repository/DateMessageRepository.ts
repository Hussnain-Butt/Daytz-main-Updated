// File: src/repository/DateMessageRepository.ts
// Repository for date message usage tracking

import pool from '../db'
import { DateMessageUsage } from '../types/DateMessage'
import * as humps from 'humps'

class DateMessageRepository {
  /**
   * Check if user has already sent a message for this date
   */
  async hasUserSentMessage(dateId: number, userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM date_message_usage
        WHERE date_id = $1 AND user_id = $2
      ) as has_sent
    `
    const { rows } = await pool.query(query, [dateId, userId])
    return rows[0].has_sent
  }

  /**
   * Mark message as sent for user
   */
  async markMessageSent(
    dateId: number,
    userId: string,
    messageType: string,
    includedPhone: boolean,
  ): Promise<DateMessageUsage> {
    const query = `
      INSERT INTO date_message_usage (date_id, user_id, message_type, included_phone)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `
    const { rows } = await pool.query(query, [dateId, userId, messageType, includedPhone])
    return humps.camelizeKeys(rows[0]) as DateMessageUsage
  }

  /**
   * Get message usage details for a date and user
   */
  async getUserMessageForDate(
    dateId: number,
    userId: string,
  ): Promise<DateMessageUsage | null> {
    const query = `
      SELECT * FROM date_message_usage
      WHERE date_id = $1 AND user_id = $2
    `
    const { rows } = await pool.query(query, [dateId, userId])
    if (rows.length === 0) return null
    return humps.camelizeKeys(rows[0]) as DateMessageUsage
  }

  /**
   * Get all message usage for a specific date
   */
  async getUsageForDate(dateId: number): Promise<DateMessageUsage[]> {
    const query = `
      SELECT * FROM date_message_usage
      WHERE date_id = $1
      ORDER BY sent_at DESC
    `
    const { rows } = await pool.query(query, [dateId])
    return rows.map((row) => humps.camelizeKeys(row)) as DateMessageUsage[]
  }
}

export default new DateMessageRepository()
