// File: src/repository/ReportsRepository.ts
// Repository for managing user reports in the database

import pool from '../db'
import { ReportEmailData } from '../types/Report'

export interface UserReport {
  id: number
  reportedUserId: string
  reportingUserId: string
  reportedVideoId: number
  reportReason: string
  reportDate: string
  createdAt: Date
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
  reviewedBy?: string
  reviewedAt?: Date
  adminNotes?: string
  actionTaken?: string
}

class ReportsRepository {
  /**
   * Create a new report in the database
   */
  async createReport(reportData: ReportEmailData): Promise<UserReport> {
    const query = `
      INSERT INTO user_reports (
        reported_user_id,
        reporting_user_id,
        reported_video_id,
        report_reason,
        report_date
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const values = [
      reportData.reportedUserId,
      reportData.reportingUserId,
      reportData.reportedVideoId,
      reportData.reportReason,
      reportData.reportDate,
    ]

    const result = await pool.query(query, values)
    return this.mapRowToReport(result.rows[0])
  }

  /**
   * Get all reports for a specific user
   */
  async getReportsByUserId(userId: string): Promise<UserReport[]> {
    const query = `
      SELECT * FROM user_reports
      WHERE reported_user_id = $1
      ORDER BY created_at DESC
    `

    const result = await pool.query(query, [userId])
    return result.rows.map(this.mapRowToReport)
  }

  /**
   * Get all reports submitted by a user
   */
  async getReportsByReporter(reporterId: string): Promise<UserReport[]> {
    const query = `
      SELECT * FROM user_reports
      WHERE reporting_user_id = $1
      ORDER BY created_at DESC
    `

    const result = await pool.query(query, [reporterId])
    return result.rows.map(this.mapRowToReport)
  }

  /**
   * Get reports by status
   */
  async getReportsByStatus(status: string): Promise<UserReport[]> {
    const query = `
      SELECT * FROM user_reports
      WHERE status = $1
      ORDER BY created_at DESC
    `

    const result = await pool.query(query, [status])
    return result.rows.map(this.mapRowToReport)
  }

  /**
   * Get report statistics for a user
   */
  async getReportStats(userId: string): Promise<{
    totalReports: number
    pendingReports: number
    actionedReports: number
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reports,
        SUM(CASE WHEN status = 'actioned' THEN 1 ELSE 0 END) as actioned_reports
      FROM user_reports
      WHERE reported_user_id = $1
    `

    const result = await pool.query(query, [userId])
    const row = result.rows[0]

    return {
      totalReports: parseInt(row.total_reports),
      pendingReports: parseInt(row.pending_reports),
      actionedReports: parseInt(row.actioned_reports),
    }
  }

  /**
   * Update report status (for admin use)
   */
  async updateReportStatus(
    reportId: number,
    status: string,
    reviewedBy: string,
    adminNotes?: string,
    actionTaken?: string
  ): Promise<UserReport> {
    const query = `
      UPDATE user_reports
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        admin_notes = $3,
        action_taken = $4
      WHERE id = $5
      RETURNING *
    `

    const values = [status, reviewedBy, adminNotes, actionTaken, reportId]
    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      throw new Error(`Report with ID ${reportId} not found`)
    }

    return this.mapRowToReport(result.rows[0])
  }

  /**
   * Check if user has already reported this content
   */
  async hasUserReportedContent(
    reportingUserId: string,
    reportedVideoId: number
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM user_reports
        WHERE reporting_user_id = $1
        AND reported_video_id = $2
      ) as has_reported
    `

    const result = await pool.query(query, [reportingUserId, reportedVideoId])
    return result.rows[0].has_reported
  }

  /**
   * Get recent reports count for rate limiting
   */
  async getRecentReportsCount(userId: string, hoursAgo: number = 24): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_reports
      WHERE reporting_user_id = $1
      AND created_at > NOW() - INTERVAL '${hoursAgo} hours'
    `

    const result = await pool.query(query, [userId])
    return parseInt(result.rows[0].count)
  }

  /**
   * Map database row to UserReport object
   */
  private mapRowToReport(row: any): UserReport {
    return {
      id: row.id,
      reportedUserId: row.reported_user_id,
      reportingUserId: row.reporting_user_id,
      reportedVideoId: row.reported_video_id,
      reportReason: row.report_reason,
      reportDate: row.report_date,
      createdAt: row.created_at,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      adminNotes: row.admin_notes,
      actionTaken: row.action_taken,
    }
  }
}

export default new ReportsRepository()
