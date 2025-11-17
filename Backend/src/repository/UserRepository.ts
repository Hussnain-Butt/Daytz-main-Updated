// File: src/repository/UserRepository.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import pool from '../db'
import { User, UpdateUserPayload } from '../types/User'
import { Pool, PoolClient } from 'pg'
import * as humps from 'humps'

const mapRowToUser = (row: any): User | null => {
  if (!row) return null
  const camelizedDbRow = humps.camelizeKeys(row)
  return {
    userId: camelizedDbRow.userId,
    auth0Id: camelizedDbRow.auth0Id || camelizedDbRow.userId,
    email: camelizedDbRow.email,
    firstName: camelizedDbRow.firstName,
    lastName: camelizedDbRow.lastName,
    profilePictureUrl: camelizedDbRow.profilePictureUrl,
    videoUrl: camelizedDbRow.videoUrl,
    zipcode: camelizedDbRow.zipcode,
    stickers: camelizedDbRow.stickers,
    tokens: typeof camelizedDbRow.tokens === 'number' ? camelizedDbRow.tokens : 0,
    enableNotifications: !!camelizedDbRow.enableNotifications,
    is_profile_complete: !!camelizedDbRow.isProfileComplete,
    createdAt: camelizedDbRow.createdAt ? new Date(camelizedDbRow.createdAt) : new Date(),
    updatedAt: camelizedDbRow.updatedAt ? new Date(camelizedDbRow.updatedAt) : new Date(),
    fcm_token: camelizedDbRow.fcmToken,
    referralSource: camelizedDbRow.referralSource,
    latitude: camelizedDbRow.latitude,
    longitude: camelizedDbRow.longitude,
    hasSeenCalendarTutorial: !!camelizedDbRow.hasSeenCalendarTutorial, // ✅ NAYI PROPERTY
  }
}

class UserRepository {
  async createUser(userData: Partial<User>): Promise<User | null> {
    const columns = [
      'user_id',
      'email',
      'first_name',
      'last_name',
      'zipcode',
      'tokens',
      'latitude',
      'longitude',
      'enable_notifications',
      'is_profile_complete',
      'has_seen_calendar_tutorial', // ✅ NAYI PROPERTY
    ]
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10', '$11'] // ✅ NAYI PROPERTY
    const values = [
      userData.userId,
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.zipcode,
      userData.tokens,
      userData.latitude,
      userData.longitude,
      userData.enableNotifications ?? true,
      userData.is_profile_complete ?? false,
      false, // ✅ NAYI PROPERTY: Default to false for new users
    ]
    const query = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders.join(
      ', ',
    )}) RETURNING *;`
    const { rows } = await pool.query(query, values)
    return rows.length > 0 ? mapRowToUser(rows[0]) : null
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserPayload,
    client: PoolClient | null = null,
  ): Promise<User | null> {
    const db = client || pool
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'userId' || key === 'auth0Id' || key === 'createdAt' || value === undefined)
        continue
      // ✅ PERSISTENT TUTORIAL: humps.decamelize will correctly convert 'hasSeenCalendarTutorial' to 'has_seen_calendar_tutorial'
      fieldsToUpdate.push(`${humps.decamelize(key)} = $${queryIndex}`)
      values.push(key === 'stickers' && value !== null ? JSON.stringify(value) : value)
      queryIndex++
    }
    if (fieldsToUpdate.length === 0) return this.getUserById(userId)
    fieldsToUpdate.push(`updated_at = NOW()`)
    values.push(userId)
    const query = `UPDATE users SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE user_id = $${queryIndex} RETURNING *;`
    const { rows } = await db.query(query, values)
    return rows.length > 0 ? mapRowToUser(rows[0]) : null
  }

  async getUserById(userId: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE user_id = $1;`
    const { rows } = await pool.query(query, [userId])
    return rows.length > 0 ? mapRowToUser(rows[0]) : null
  }

  async getAllUsers(): Promise<User[]> {
    const query = `SELECT * FROM users ORDER BY created_at DESC;`
    const { rows } = await pool.query(query)
    return rows.map(mapRowToUser).filter((user): user is User => user !== null)
  }

  async deleteUser(userId: string): Promise<boolean> {
    const query = `DELETE FROM users WHERE user_id = $1;`
    const result = await pool.query(query, [userId])
    return (result.rowCount ?? 0) > 0
  }

  async replenishAllUserTokens(amount: number): Promise<number> {
    const query = `UPDATE users SET tokens = $1, updated_at = NOW() RETURNING user_id;`
    const { rowCount } = await pool.query(query, [amount])
    return rowCount ?? 0
  }

  async registerPushToken(userId: string, fcmToken: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE users SET fcm_token = NULL WHERE fcm_token = $1 AND user_id != $2;`,
        [fcmToken, userId],
      )
      const result = await client.query(
        `UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE user_id = $2;`,
        [fcmToken, userId],
      )
      await client.query('COMMIT')
      return (result.rowCount ?? 0) > 0
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async spendUserTokens(
    userId: string,
    amountToSpend: number,
    client: PoolClient | null = null,
  ): Promise<User | null> {
    const isExternalTransaction = client !== null
    const db = client || (await pool.connect())
    try {
      if (!isExternalTransaction) await db.query('BEGIN')
      const selectResult = await db.query(
        'SELECT tokens FROM users WHERE user_id = $1 FOR UPDATE;',
        [userId],
      )
      if (selectResult.rows.length === 0) throw new Error(`User with ID ${userId} not found.`)
      const currentTokens = selectResult.rows[0].tokens as number
      if (currentTokens < amountToSpend) {
        const error = new Error(`Insufficient funds`)
        ;(error as any).code = 'INSUFFICIENT_FUNDS'
        throw error
      }
      const updateResult = await db.query(
        `UPDATE users SET tokens = tokens - $1, updated_at = NOW() WHERE user_id = $2 RETURNING *;`,
        [amountToSpend, userId],
      )
      if (!isExternalTransaction) await db.query('COMMIT')
      return mapRowToUser(updateResult.rows[0])
    } catch (error) {
      if (!isExternalTransaction) await db.query('ROLLBACK')
      throw error
    } finally {
      if (!isExternalTransaction) (db as PoolClient).release()
    }
  }

  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const query =
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;'
    const result = await pool.query(query, [blockerId, blockedId])
    return (result.rowCount ?? 0) > 0
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const query = 'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2;'
    const result = await pool.query(query, [blockerId, blockedId])
    return (result.rowCount ?? 0) > 0
  }

  async getBlockedUsers(blockerId: string): Promise<User[]> {
    const query = `
      SELECT u.* FROM users u
      JOIN user_blocks b ON u.user_id = b.blocked_id
      WHERE b.blocker_id = $1 ORDER BY u.first_name, u.last_name;
    `
    const { rows } = await pool.query(query, [blockerId])
    return rows.map(mapRowToUser).filter((user): user is User => user !== null)
  }
}

export default UserRepository
