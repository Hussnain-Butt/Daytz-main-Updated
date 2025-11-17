// ✅ COMPLETE AND FINAL UPDATED CODE

import * as admin from 'firebase-admin'
import { Pool, PoolClient, QueryResult } from 'pg'
import pool from '../../db'
import { Attraction } from '../../types/Attraction'
import { format as formatDate } from 'date-fns'

// --- Firebase Initialization Logic ---
if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountString) {
    console.error(
      '[Firebase Admin] FATAL ERROR: The FIREBASE_SERVICE_ACCOUNT environment variable is not set.',
    )
    throw new Error(
      'Firebase service account credentials are not available in environment variables.',
    )
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountString)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log(
      '[NotificationService] Firebase Admin SDK initialized successfully from environment variable.',
    )
  } catch (error) {
    console.error(
      '[Firebase Admin] FATAL ERROR: Failed to parse or use FIREBASE_SERVICE_ACCOUNT.',
      error,
    )
    throw new Error('Failed to initialize Firebase Admin SDK.')
  }
}

// --- Type Interfaces ---
interface SenderProfileInfo {
  userId: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl?: string | null
  videoUrl?: string | null
}

// --- Service Class ---
class NotificationService {
  // --- Private Helper Methods ---
  private async createDbNotification(
    userId: string,
    message: string,
    type: string,
    relatedEntityId: string | number | null,
    proposingUserId: string | null = null,
    client: PoolClient | null = null,
  ) {
    const db = client || pool
    try {
      const query = `
        INSERT INTO notifications (user_id, message, type, status, related_entity_id, proposing_user_id) 
        VALUES ($1, $2, $3, 'unread', $4, $5);
      `
      await db.query(query, [
        userId,
        message,
        type,
        relatedEntityId ? String(relatedEntityId) : null,
        proposingUserId,
      ])
    } catch (error) {
      console.error(`[DB Notification] Failed to store notification for user ${userId}:`, error)
    }
  }

  private async getUserProfile(
    userId: string,
    client: PoolClient | null = null,
  ): Promise<SenderProfileInfo | null> {
    const db = client || pool
    const query = `SELECT user_id, first_name, last_name, profile_picture_url FROM users WHERE user_id = $1;`
    const result: QueryResult<SenderProfileInfo> = await db.query(query, [userId])
    return result.rows.length > 0 ? result.rows[0] : null
  }

  private async getFcmToken(
    userId: string,
    client: PoolClient | null = null,
  ): Promise<string | null> {
    const db = client || pool
    const result = await db.query('SELECT fcm_token FROM users WHERE user_id = $1', [userId])
    return result.rows[0]?.fcm_token || null
  }

  private async sendFcmNotification(
    token: string,
    title: string,
    body: string,
    imageUrl?: string | null,
    data?: { [key: string]: string },
  ) {
    if (!token) return
    const messagePayload: admin.messaging.Message = {
      token,
      notification: { title, body, imageUrl: imageUrl || undefined },
      data,
      android: { notification: { imageUrl: imageUrl || undefined } },
      apns: {
        payload: { aps: { 'mutable-content': 1 } },
        fcmOptions: { imageUrl: imageUrl || undefined },
      },
    }
    try {
      await admin.messaging().send(messagePayload)
    } catch (error) {
      console.error(`[FCM] Error sending notification "${title}":`, error)
    }
  }

  // --- Public Methods ---

  async sendAttractionProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    storyDate: string,
    client: PoolClient | null = null,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId, client)
    if (!senderProfile) return

    const formattedDate = formatDate(new Date(storyDate), 'MMMM do')
    const title = `Interest for your ${formattedDate} story`
    const body = `Someone wants to meet you on ${formattedDate}. Did you see anyone on that date you want to meet?`
    const type = 'ATTRACTION_PROPOSAL'

    await this.createDbNotification(receiverUserId, body, type, storyDate, senderUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, senderProfile.profilePictureUrl, {
        type,
        storyDate: storyDate,
        senderUserId: senderUserId,
      })
    }
  }

  async sendNewMatchProposalNotification(
    attraction1: Attraction,
    attraction2: Attraction,
    client: PoolClient | null = null,
  ) {
    // ... (This function remains unchanged)
    const score1 =
      (attraction1.romanticRating || 0) +
      (attraction1.sexualRating || 0) +
      (attraction1.friendshipRating || 0)
    const score2 =
      (attraction2.romanticRating || 0) +
      (attraction2.sexualRating || 0) +
      (attraction2.friendshipRating || 0)
    let recipientId: string, senderId: string
    if (score1 < score2) {
      recipientId = attraction1.userFrom!
      senderId = attraction2.userFrom!
    } else {
      recipientId = attraction2.userFrom!
      senderId = attraction1.userFrom!
    }
    const senderProfile = await this.getUserProfile(senderId, client)
    if (!senderProfile) return

    const title = 'It’s a Match! 🎉'
    const body = 'They feel the same. Does their Plan work for you to meet in real life?'
    const type = 'MATCH_PROPOSAL'
    const formattedDate = formatDate(new Date(attraction1.date!), 'yyyy-MM-dd')
    await this.createDbNotification(recipientId, body, type, formattedDate, senderId, client)
    const token = await this.getFcmToken(recipientId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, senderProfile.profilePictureUrl, {
        type: type,
        dateForProposal: formattedDate,
        userToId: senderId,
      })
    }
  }

  async sendDateProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    dateDetails: { dateId: number; date: string; time: string; venue: string },
    client: PoolClient | null = null,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId, client)
    if (!senderProfile) return

    const senderName = senderProfile.firstName || 'Someone'
    const body = `${senderName} proposed a date at ${dateDetails.venue}. Tap to see details!`
    const type = 'DATE_PROPOSAL'
    await this.createDbNotification(
      receiverUserId,
      body,
      type,
      dateDetails.dateId,
      senderUserId,
      client,
    )
    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      await this.sendFcmNotification(
        token,
        'New Date Proposal! ✨',
        body,
        senderProfile.profilePictureUrl,
        { type, dateId: String(dateDetails.dateId) },
      )
    }
  }

  // ✅ UPDATED FUNCTION
  async sendDateResponseNotification(
    responderUserId: string,
    receiverUserId: string,
    responseType: 'ACCEPTED' | 'DECLINED' | 'DECLINED_UNAVAILABLE', // Naya type add kiya gaya hai
    dateId: number,
    client: PoolClient | null = null,
  ) {
    const responderProfile = await this.getUserProfile(responderUserId, client)
    if (!responderProfile) return

    const responderName = responderProfile.firstName || 'Someone'
    let title = ''
    let body = ''
    let type = ''

    if (responseType === 'ACCEPTED') {
      title = 'Date Confirmed! 🎉'
      body = `${responderName} has accepted your date proposal!`
      type = 'DATE_APPROVED'
    } else if (responseType === 'DECLINED') {
      title = 'Date Update'
      body = `${responderName} has declined the proposed date.`
      type = 'DATE_DECLINED'
    } else if (responseType === 'DECLINED_UNAVAILABLE') {
      // Naya case handle kiya gaya hai
      title = 'Date Update'
      body = `Sorry, ${responderName} is unavailable at that time. Please suggest another time!`
      type = 'DATE_DECLINED' // Type wahi rahega, sirf message alag hai
    }

    await this.createDbNotification(receiverUserId, body, type, dateId, responderUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, responderProfile.profilePictureUrl, {
        type,
        dateId: String(dateId),
      })
    }
  }

  async sendDateRescheduledNotification(
    updaterUserId: string,
    receiverUserId: string,
    dateId: number,
    client: PoolClient | null = null,
  ) {
    const updaterProfile = await this.getUserProfile(updaterUserId, client)
    if (!updaterProfile) return

    const updaterName = updaterProfile.firstName || 'Someone'
    const body = `${updaterName} has rescheduled your date. Tap to see the new details.`
    const type = 'DATE_RESCHEDULED'
    await this.createDbNotification(receiverUserId, body, type, dateId, updaterUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      await this.sendFcmNotification(
        token,
        '🗓️ Date Rescheduled',
        body,
        updaterProfile.profilePictureUrl,
        { type, dateId: String(dateId) },
      )
    }
  }

  async sendDateCancelledNotification(
    cancellerUserId: string,
    receiverUserId: string,
    dateId: number,
    client: PoolClient | null = null,
  ) {
    const cancellerProfile = await this.getUserProfile(cancellerUserId, client)
    if (!cancellerProfile) return

    const cancellerName = cancellerProfile.firstName || 'Someone'
    const body = `${cancellerName} has cancelled your upcoming date.`
    const type = 'DATE_CANCELLED'
    await this.createDbNotification(receiverUserId, body, type, dateId, cancellerUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      await this.sendFcmNotification(
        token,
        '😟 Date Cancelled',
        body,
        cancellerProfile.profilePictureUrl,
        { type, dateId: String(dateId) },
      )
    }
  }

  // ✅ NAYA FEATURE: FUNCTION FOR CONFLICT NOTIFICATION
  async sendDateConflictNotification(
    fromUserId: string,
    toUserId: string,
    dateId: number,
    client?: PoolClient | null,
  ) {
    const fromUser = await this.getUserProfile(fromUserId, client)
    const title = 'You have a scheduling conflict!'
    const body = `${
      fromUser?.firstName || 'Someone'
    } has proposed a date at a time you're already busy. Check your calendar to resolve it!`
    const type = 'DATE_CONFLICT'

    await this.createDbNotification(toUserId, body, type, dateId, fromUserId, client)
    const token = await this.getFcmToken(toUserId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, fromUser?.profilePictureUrl, {
        type,
        dateId: String(dateId),
      })
    }
  }

  // ✅ NAYA FEATURE: FUNCTION FOR RESCHEDULING NOTIFICATION
  async sendDateNeedsReschedulingNotification(
    fromUserId: string, // User B
    toUserId: string, // User A
    dateId: number,
    client?: PoolClient | null,
  ) {
    const fromUser = await this.getUserProfile(fromUserId, client)
    const title = 'A date needs to be rescheduled'
    const body = `Your date with ${
      fromUser?.firstName || 'a user'
    } needs to be rescheduled. Please check your chat to find a new time.`
    const type = 'DATE_NEEDS_RESCHEDULING'

    await this.createDbNotification(toUserId, body, type, dateId, fromUserId, client)
    const token = await this.getFcmToken(toUserId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, fromUser?.profilePictureUrl, {
        type,
        dateId: String(dateId),
      })
    }
  }
}

export default NotificationService
