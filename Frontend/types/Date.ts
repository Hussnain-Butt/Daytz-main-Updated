// File: types/Date.ts (Frontend)
// ✅ COMPLETE AND FINAL UPDATED CODE

export type DateOutcome = 'amazing' | 'no_show_cancelled' | 'other';

// ✅ Naye statuses add kiye gaye hain
export type DateStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'pending_conflict'
  | 'needs_rescheduling';

export interface DetailedDateObject {
  dateId: number;
  date: string;
  time: string | null;
  status: DateStatus;
  locationMetadata?: { name?: string; address?: string } | null;
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null;
  userFrom: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
    videoUrl: string | null;
  };
  userTo: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpcomingDate {
  dateId: number;
  date: string;
  time: string | null;
  status: DateStatus; // ✅ Updated type
  updatedAt?: string;
  locationMetadata: { name: string };
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null;
  otherUser: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  userFrom: string;
  userTo: string;
  // ✅ Yeh flags add kiye gaye hain taake UI "Response Needed" dikha sake
  userFromApproved: boolean;
  userToApproved: boolean;
  romanticRating: number;
  sexualRating: number;
  friendshipRating: number;
  myOutcome: DateOutcome | null;
  myNotes: string | null;
}

export interface DateObject {
  dateId: number;
  date: string;
  time: string | null;
  userFrom: string;
  userTo: string;
  userFromApproved: boolean;
  userToApproved: boolean;
  locationMetadata?: { name?: string; address?: string } | null;
  status: DateStatus; // ✅ Updated type
  // ✅ Nayi optional property
  conflictsWithDateId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatePayload {
  date: string;
  time: string | null;
  userTo: string;
  locationMetadata?: { name?: string; address?: string } | null;
  isUpdate?: boolean;
  romanticRating: number;
  sexualRating: number;
  friendshipRating: number;
  longTermPotential?: boolean;
  intellectual?: boolean;
  emotional?: boolean;
}
