// File: src/types/User.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

// Represents the full User object, matching your database schema.
export interface User {
  userId: string
  auth0Id?: string
  email: string | null
  firstName: string | null
  lastName: string | null
  profilePictureUrl: string | null
  videoUrl: string | null
  zipcode: string | null
  stickers: any | null
  tokens: number
  enableNotifications: boolean
  is_profile_complete: boolean
  createdAt: Date
  updatedAt: Date
  fcm_token?: string | null
  referralSource?: string | null
  latitude?: number | null
  longitude?: number | null
  hasSeenCalendarTutorial: boolean // ✅ NAYI PROPERTY
}

// Defines what the frontend is allowed to send to update a user's profile.
export interface UpdateUserPayload {
  firstName?: string | null
  lastName?: string | null
  zipcode?: string
  stickers?: any
  enableNotifications?: boolean
  is_profile_complete?: boolean
  videoUrl?: string | null
  profilePictureUrl?: string | null
  fcm_token?: string | null
  referralSource?: string
  tokens?: number
  latitude?: number | null
  longitude?: number | null
  hasSeenCalendarTutorial?: boolean // ✅ NAYI PROPERTY
}

// Data structure used internally to create a new user.
export interface CreateUserInternalData {
  userId: string
  auth0Id?: string
  firstName?: string
  lastName?: string
  email: string | null
  profilePictureUrl?: string
  zipcode?: string
}
