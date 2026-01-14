// File: src/types/DateMessage.ts
// Types for date messaging feature

export enum QuickMessageType {
  SEE_YOU_SOON = 'See You Soon',
  RUNNING_LATE = "I'm running late, please wait",
  RESCHEDULE_REQUEST = 'Something came up. Can we reschedule?',
}

export interface SendDateMessageRequest {
  messageType: QuickMessageType
  includePhoneNumber: boolean
  phoneNumber?: string
}

export interface DateMessageUsage {
  id: number
  dateId: number
  userId: string
  messageType: string
  includedPhone: boolean
  sentAt: Date
}

export interface DateMessageStatusResponse {
  hasUsed: boolean
  usageDetails?: DateMessageUsage
}
