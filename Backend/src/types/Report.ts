// File: src/types/Report.ts
// Type definitions for Story Report functionality

export enum ReportReason {
  INAPPROPRIATE_IMAGE = 'Inappropriate Image (Nudity/Graphic)',
  INAPPROPRIATE_SPEECH = 'Inappropriate Speech (Verbal Abuse/Slandering/etc..)',
  INAPPROPRIATE_VIDEO = 'Inappropriate Video (Pornographic/Nudity/Graphic)',
  HATE_SPEECH = 'Hate Speech (Racism/Sexism/etc)',
  SPAM_ADVERTISEMENT = 'Spam / Advertisement',
}

export interface SubmitReportRequest {
  reportedUserId: string
  reportedVideoId: number // calendarId
  reportReason: string
  date: string // YYYY-MM-DD
}

export interface ReportEmailData {
  reportedUserId: string
  reportingUserId: string
  reportReason: string
  reportedVideoId: number
  reportDate: string // YYYY-MM-DD
  reportTime: string // PST timezone formatted time
}
