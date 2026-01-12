-- Migration: Create User Reports Table
-- Purpose: Store all user-submitted reports for tracking and admin review
-- Created: 2026-01-12

CREATE TABLE IF NOT EXISTS user_reports (
  id SERIAL PRIMARY KEY,
  
  -- User Information
  reported_user_id VARCHAR(255) NOT NULL,  -- User being reported (Auth0 ID)
  reporting_user_id VARCHAR(255) NOT NULL, -- User who submitted the report (Auth0 ID)
  
  -- Content Information
  reported_video_id INTEGER NOT NULL,      -- Calendar ID / Video ID being reported
  report_reason VARCHAR(255) NOT NULL,     -- Selected report reason
  report_date DATE NOT NULL,               -- Date from the story/calendar
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),      -- When report was submitted
  status VARCHAR(50) DEFAULT 'pending',    -- pending, reviewed, actioned, dismissed
  
  -- Admin Review Fields
  reviewed_by VARCHAR(255),                -- Admin user ID who reviewed
  reviewed_at TIMESTAMP,                   -- When it was reviewed
  admin_notes TEXT,                        -- Admin notes/comments
  action_taken VARCHAR(255),               -- What action was taken (if any)
  
  -- Indexes for performance
  CONSTRAINT fk_reported_video 
    FOREIGN KEY (reported_video_id) 
    REFERENCES calendar_days(id) 
    ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_reporting_user ON user_reports(reporting_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at DESC);
CREATE INDEX idx_user_reports_video_id ON user_reports(reported_video_id);

-- Add comment to table
COMMENT ON TABLE user_reports IS 'Stores user-submitted reports for inappropriate content';
COMMENT ON COLUMN user_reports.status IS 'Status: pending, reviewed, actioned, dismissed';
COMMENT ON COLUMN user_reports.report_reason IS 'One of: Inappropriate Image, Inappropriate Speech, Inappropriate Video, Hate Speech, Spam/Advertisement';
