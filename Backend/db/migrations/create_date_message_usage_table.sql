-- Migration: Create Date Message Usage Table
-- Purpose: Track one-time message usage per user per date
-- Created: 2026-01-12

CREATE TABLE IF NOT EXISTS date_message_usage (
  id SERIAL PRIMARY KEY,
  date_id INTEGER NOT NULL REFERENCES dates(date_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  message_type VARCHAR(100) NOT NULL,
  included_phone BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one message per user per date
  UNIQUE(date_id, user_id)
);

CREATE INDEX idx_date_message_usage_date ON date_message_usage(date_id);
CREATE INDEX idx_date_message_usage_user ON date_message_usage(user_id);

COMMENT ON TABLE date_message_usage IS 'Tracks one-time quick messages sent between date participants';
COMMENT ON COLUMN date_message_usage.message_type IS 'Type of quick message: See You Soon, Running Late, Reschedule Request';
COMMENT ON COLUMN date_message_usage.included_phone IS 'Whether user included their phone number with the message';
