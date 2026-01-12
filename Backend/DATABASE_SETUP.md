# Database Setup for Reports Feature

## Current Status

**Abhi kya hai:** Currently, reports sirf email ke through bheje ja rahe hain. Database mein store nahi ho rahi.

**Kya karna chahiye:** Reports ko database mein store karna **recommended** hai for:
- Report history tracking
- Admin review dashboard
- Duplicate report prevention
- Rate limiting abuse
- Analytics and statistics

## Option 1: Only Email (Current Implementation) ✅

**Kuch nahi karna padega!** 

Agar aap sirf email chahte hain (jaise abhi hai), toh database changes ki zaroorat nahi hai.

✅ **Working:** Reports email se `user_reports@daytz.com` par jayengi  
✅ **No database required**

## Option 2: Email + Database Storage (Recommended) 🌟

Agar aap reports ko database mein bhi save karna chahte hain:

### Step 1: Run Migration Script

```bash
# PostgreSQL mein connect karein
psql -U your_username -d your_database_name

# Ya phir migration file ko run karein
psql -U your_username -d your_database_name -f db/migrations/create_reports_table.sql
```

### Step 2: Update Report Handler

`src/handlers/reportHandlers.ts` mein ye changes karein:

```typescript
// Add import
import ReportsRepository from '../repository/ReportsRepository'

// Inside submitReportHandler, after sending email:
try {
  // ... existing email sending code ...
  
  // ✅ NEW: Save to database
  await ReportsRepository.createReport(emailData)
  
  console.log(`[ReportHandlers] Report saved to database`)
  
  // ... rest of the code ...
} catch (error) {
  // ... error handling ...
}
```

### Step 3: Add Rate Limiting (Optional but Recommended)

```typescript
// At the start of submitReportHandler
const recentReportsCount = await ReportsRepository.getRecentReportsCount(reportingUserId, 24)

if (recentReportsCount >= 10) {
  return res.status(429).json({
    message: 'Too many reports. Please try again later.',
  })
}
```

### Step 4: Prevent Duplicate Reports (Optional)

```typescript
// Check if user already reported this content
const hasReported = await ReportsRepository.hasUserReportedContent(
  reportingUserId,
  reportedVideoId
)

if (hasReported) {
  return res.status(400).json({
    message: 'You have already reported this content.',
  })
}
```

## Quick Setup Commands

### For PostgreSQL:

```sql
-- 1. Create table
\i c:/dev/Daytz-main\ -\ Copy/Backend/db/migrations/create_reports_table.sql

-- 2. Verify table was created
\dt user_reports

-- 3. Check table structure
\d user_reports
```

### For Testing:

```sql
-- Insert test report
INSERT INTO user_reports (
  reported_user_id,
  reporting_user_id,
  reported_video_id,
  report_reason,
  report_date
) VALUES (
  'auth0|test123',
  'auth0|reporter456',
  42,
  'Inappropriate Video (Pornographic/Nudity/Graphic)',
  '2026-01-12'
);

-- View all reports
SELECT * FROM user_reports ORDER BY created_at DESC;

-- Get pending reports
SELECT * FROM user_reports WHERE status = 'pending';
```

## Available Queries

### Get all reports for a user:
```sql
SELECT * FROM user_reports 
WHERE reported_user_id = 'auth0|user123'
ORDER BY created_at DESC;
```

### Get report statistics:
```sql
SELECT 
  status,
  COUNT(*) as count
FROM user_reports
GROUP BY status;
```

### Get recent reports (last 24 hours):
```sql
SELECT * FROM user_reports
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Update report status (admin action):
```sql
UPDATE user_reports
SET 
  status = 'reviewed',
  reviewed_by = 'admin@daytz.com',
  reviewed_at = NOW(),
  admin_notes = 'Content removed',
  action_taken = 'User warned'
WHERE id = 1;
```

## Troubleshooting

### Error: relation "user_reports" does not exist
```bash
# Run the migration script
psql -U your_username -d your_database -f db/migrations/create_reports_table.sql
```

### Error: foreign key constraint fails
```bash
# Make sure calendar_days table exists first
# Or remove the foreign key constraint from the migration
```

## Summary

**Zaruri hai?** Nahi - current implementation me database ki zaroorat nahi

**Recommended hai?** Haan - future me reports track karne ke liye useful hai

**Kya karna hai:**
1. ✅ Abhi ke liye: Kuch nahi (sirf email)
2. 🌟 Future ke liye: Migration run karke database storage add kar sakte hain

## Files to Review

- Migration: `db/migrations/create_reports_table.sql`
- Repository: `src/repository/ReportsRepository.ts`
- Current Handler: `src/handlers/reportHandlers.ts`
