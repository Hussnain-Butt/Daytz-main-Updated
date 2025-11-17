// File: src/types/Date.ts (Backend)
// ✅ COMPLETE AND FINAL UPDATED CODE

// Naye statuses add kiye gaye hain
export type DateStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'pending_conflict'
  | 'needs_rescheduling'

export type DateOutcome = 'amazing' | 'no_show_cancelled' | 'other'

export interface DateObject {
  dateId: number
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: { name?: string; address?: string; place_id?: string } | null
  status: DateStatus
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateDateInternal {
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: { name?: string; address?: string } | null
  status: DateStatus
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null
}

export interface UpcomingDate {
  dateId: number
  date: string
  time: string | null
  updatedAt: string
  locationMetadata: { name: string }
  status: DateStatus
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null
  otherUser: {
    userId: string
    firstName: string
    profilePictureUrl: string | null
  }
  userFrom: string
  userTo: string
  userFromApproved: boolean // Frontend ke liye zaroori
  userToApproved: boolean // Frontend ke liye zaroori
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  myOutcome: DateOutcome | null
  myNotes: string | null
}

export interface CreateDatePayload {
  date: string
  time: string | null
  userTo: string
  locationMetadata?: { name?: string; address?: string } | null
  isUpdate?: boolean
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  longTermPotential?: boolean
  intellectual?: boolean
  emotional?: boolean
}
