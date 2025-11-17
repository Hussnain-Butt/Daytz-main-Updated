// File: src/handlers/notificationHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE (WITH HISTORY LOGIC)

import { Response } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import pool from '../db'

export const getMyNotificationsHandler = asyncHandler(async (req: CustomRequest, res: Response) => {
  const userId = req.userId
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // ✅✅✅ YEH CHANGE KIYA GAYA HAI - START ✅✅✅

    // Step 1: Pehle unread notifications dhoondne ki koshish karein
    const unreadQuery = `
      SELECT notification_id, user_id, message, type, status, related_entity_id, created_at, proposing_user_id
      FROM notifications 
      WHERE user_id = $1 AND status = 'unread' 
      ORDER BY created_at DESC
      LIMIT 15;
    `
    let { rows } = await pool.query(unreadQuery, [userId])

    // Step 2: Agar koi unread notification nahi mili, to pichli 15 read notifications (history) dhoondein
    if (rows.length === 0) {
      console.log(`[Notifications] No unread notifications for user ${userId}. Fetching history.`)
      const readQuery = `
        SELECT notification_id, user_id, message, type, status, related_entity_id, created_at, proposing_user_id
        FROM notifications 
        WHERE user_id = $1 AND status = 'read' 
        ORDER BY created_at DESC
        LIMIT 15;
      `
      const result = await pool.query(readQuery, [userId])
      rows = result.rows
    }

    // ✅✅✅ END OF CHANGE ✅✅✅

    res.status(200).json(rows)
  } catch (error) {
    console.error(
      `[getMyNotificationsHandler] Error fetching notifications for user ${userId}:`,
      error,
    )
    res.status(500).json({ message: 'Failed to retrieve notifications.' })
  }
})

// Baaki functions (markNotificationsAsReadHandler, etc.) waise hi rahenge, unko change nahi karna
// ... (rest of the file remains the same)

// Handler to mark notifications as read
export const markNotificationsAsReadHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    // ... (no changes here)
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
      const query = `
          UPDATE notifications 
          SET status = 'read' 
          WHERE user_id = $1 AND status = 'unread';
        `
      await pool.query(query, [userId])
      res.status(200).json({ message: 'All notifications marked as read.' })
    } catch (error) {
      console.error(`[markNotificationsAsReadHandler] Error for user ${userId}:`, error)
      res.status(500).json({ message: 'Failed to update notifications.' })
    }
  },
)

// Handler to get the count of unread notifications for the authenticated user
export const getUnreadNotificationsCountHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    // ... (no changes here)
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const query = `
          SELECT COUNT(*) AS unread_count 
          FROM notifications 
          WHERE user_id = $1 AND status = 'unread';
        `
      const { rows } = await pool.query(query, [userId])
      const unreadCount = parseInt(rows[0]?.unread_count || '0', 10)
      res.status(200).json({ unreadCount })
    } catch (error) {
      console.error(
        `[getUnreadNotificationsCountHandler] Error fetching unread count for user ${userId}:`,
        error,
      )
      res.status(500).json({ message: 'Failed to retrieve unread notification count. ' })
    }
  },
)
