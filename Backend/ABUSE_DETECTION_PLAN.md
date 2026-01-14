# Internal Abuse Detection System - Implementation Plan

## Client Requirement Analysis

### What Client Wants 🎯

**Problem:** Kuch users system ko abuse kar rahe hain by posting too frequently (daily or multiple times per day).

**Goal:** Automatically detect aur internally flag karein un users ko jo suspicious posting patterns show kar rahe hain.

**Use Case Examples:**
1. **Spam Users:** Har roz multiple calendar posts (promoting business/services)
2. **Bot Accounts:** Automated posting for advertisement
3. **System Gaming:** Trying to appear more active than they are

### What "Internal Flagging" Means

- ✅ **Internal:** Only admins/moderators can see the flags
- ✅ **Automated:** System automatically detects patterns
- ✅ **Non-Intrusive:** Regular users don't know they're flagged
- ✅ **Reviewable:** Admins can review and take action

---

## Proposed Solution

### 1. Detection Metrics

Track these patterns for abuse detection:

#### Daily Posting Pattern
- **Normal User:** 2-4 calendar posts per week
- **Active User:** 1 post per day (acceptable)
- **Suspicious:** 1+ posts per day for 7+ consecutive days
- **High Risk:** 2+ posts per day for 3+ consecutive days

#### Weekly Analysis
- **Total posts in last 7 days**
- **Consecutive days with posts**
- **Average posts per day**

### 2. Flagging Levels

**Level 1 - Monitor (Yellow Flag) 🟡**
- 7+ posts in last 7 days
- Action: Monitor only, no restrictions

**Level 2 - Warning (Orange Flag) 🟠**
- 10+ posts in last 7 days OR
- 2+ posts per day for 3+ consecutive days
- Action: Monitor closely, consider email warning

**Level 3 - High Risk (Red Flag) 🔴**
- 14+ posts in last 7 days OR
- 3+ posts per day for 2+ consecutive days
- Action: Admin review required, possible account restrictions

### 3. Admin Dashboard Features

**User List with Flags:**
- Display all flagged users
- Show flag level (Yellow/Orange/Red)
- Show posting statistics
- Last flag date
- Action buttons (Review/Warn/Restrict)

**User Detail View:**
- Complete posting history
- Date/time of each post
- Content preview
- User profile information
- Previous flags/warnings
- Action history

**Actions Available:**
- Send warning email
- Temporary post restriction (e.g., max 1 post per day)
- Account suspension
- Remove flag (if false positive)
- Add admin notes

---

## Technical Implementation

### Database Schema

#### New Table: `user_flags`
```sql
CREATE TABLE user_flags (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  flag_type VARCHAR(50) NOT NULL, -- 'excessive_posting', 'spam', 'bot_activity'
  flag_level VARCHAR(20) NOT NULL, -- 'monitor', 'warning', 'high_risk'
  
  -- Detection Data
  posts_last_7_days INTEGER DEFAULT 0,
  consecutive_days INTEGER DEFAULT 0,
  avg_posts_per_day DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'reviewed', 'dismissed'
  flagged_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),
  admin_notes TEXT,
  
  -- Actions Taken
  warning_sent BOOLEAN DEFAULT FALSE,
  warning_sent_at TIMESTAMP,
  restrictions_applied JSONB, -- { "max_posts_per_day": 1, "expires_at": "..." }
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_flags_user_id ON user_flags(user_id);
CREATE INDEX idx_user_flags_status ON user_flags(status);
CREATE INDEX idx_user_flags_level ON user_flags(flag_level);
```

#### New Table: `posting_activity_log`
```sql
CREATE TABLE posting_activity_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  calendar_id INTEGER REFERENCES calendar_days(id),
  posted_at TIMESTAMP DEFAULT NOW(),
  post_date DATE NOT NULL, -- The date the calendar post is for
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posting_activity_user ON posting_activity_log(user_id);
CREATE INDEX idx_posting_activity_date ON posting_activity_log(posted_at DESC);
```

### Backend Components

#### 1. Repository: `FlaggingRepository.ts`

```typescript
class FlaggingRepository {
  // Get user posting stats for last N days
  async getUserPostingStats(userId: string, days: number): Promise<PostingStats>
  
  // Create or update flag for user
  async createOrUpdateFlag(userId: string, flagData: FlagData): Promise<UserFlag>
  
  // Get all active flags
  async getActiveFlagsForAdmin(filters?: FlagFilters): Promise<UserFlag[]>
  
  // Get flag details for specific user
  async getUserFlag(userId: string): Promise<UserFlag | null>
  
  // Update flag status (reviewed, dismissed)
  async updateFlagStatus(flagId: number, status: string, adminId: string, notes?: string): Promise<void>
  
  // Log posting activity
  async logPostingActivity(userId: string, calendarId: number, postDate: string): Promise<void>
}
```

#### 2. Service: `AbuseDetectionService.ts`

```typescript
interface PostingStats {
  postsLast7Days: number
  consecutiveDays: number
  avgPostsPerDay: number
  lastPostDate: string
}

class AbuseDetectionService {
  // Analyze posting pattern and determine flag level
  async analyzeUser(userId: string): Promise<FlagLevel | null> {
    const stats = await this.getPostingStats(userId)
    
    if (stats.postsLast7Days >= 14 || stats.consecutiveDays >= 7) {
      return 'high_risk'
    } else if (stats.postsLast7Days >= 10) {
      return 'warning'
    } else if (stats.postsLast7Days >= 7) {
      return 'monitor'
    }
    
    return null // No flag
  }
  
  // Run periodic check on all users
  async runDailyAbuseCheck(): Promise<{flagged: number, cleared: number}>
  
  // Send warning email to flagged user
  async sendWarningEmail(userId: string, flagLevel: string): Promise<void>
  
  // Apply posting restrictions
  async applyPostingRestrictions(userId: string, restrictions: Restrictions): Promise<void>
}
```

#### 3. Middleware: Check Posting Limits

```typescript
// In createCalendarDayHandler, add check before allowing post
const checkPostingLimits = async (userId: string) => {
  const flag = await flaggingRepo.getUserFlag(userId)
  
  if (flag?.restrictions_applied?.max_posts_per_day) {
    const todayPosts = await getPostsToday(userId)
    if (todayPosts >= flag.restrictions_applied.max_posts_per_day) {
      throw new Error('Daily posting limit reached. Contact support.')
    }
  }
}
```

#### 4. Handlers: `flaggingHandlers.ts`

```typescript
// Admin endpoints
export const getActiveFlagsHandler // GET /api/admin/flags
export const getUserFlagDetailsHandler // GET /api/admin/flags/:userId
export const updateFlagHandler // PATCH /api/admin/flags/:flagId
export const sendWarningHandler // POST /api/admin/flags/:flagId/warn
export const applyRestrictionsHandler // POST /api/admin/flags/:flagId/restrict
export const dismissFlagHandler // POST /api/admin/flags/:flagId/dismiss
```

---

## Configuration

### Environment Variables

```env
# Abuse Detection Settings
ABUSE_DETECTION_ENABLED=true
POSTING_LIMIT_MONITOR=7        # Posts in 7 days to trigger monitor
POSTING_LIMIT_WARNING=10       # Posts in 7 days to trigger warning
POSTING_LIMIT_HIGH_RISK=14     # Posts in 7 days to trigger high risk
CONSECUTIVE_DAYS_LIMIT=7       # Consecutive days to trigger high risk
ADMIN_EMAIL=admin@daytz.com    # Email for admin alerts
```

### Cron Job Setup

```typescript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[AbuseDetection] Running daily check...')
  const results = await abuseDetectionService.runDailyAbuseCheck()
  console.log('[AbuseDetection] Results:', results)
})
```

---

## Implementation Phases

### Phase 1: Core Detection (Week 1)
- [ ] Create database schema
- [ ] Implement `FlaggingRepository`
- [ ] Implement `AbuseDetectionService`
- [ ] Add activity logging to calendar post creation
- [ ] Create automated detection logic

### Phase 2: Admin Interface (Week 2)
- [ ] Create admin API endpoints
- [ ] Implement flag management handlers
- [ ] Add email notifications
- [ ] Create posting restriction logic

### Phase 3: Dashboard (Week 3 - Optional)
- [ ] Build admin UI for viewing flags
- [ ] Add user detail views
- [ ] Implement action buttons
- [ ] Add analytics/charts

### Phase 4: Testing & Refinement
- [ ] Test detection thresholds
- [ ] Verify false positive rate
- [ ] Fine-tune limits
- [ ] Add admin documentation

---

## Testing Scenarios

### Test 1: Normal User (Should NOT Flag)
```
Day 1: 1 post
Day 3: 1 post
Day 5: 1 post
Result: ✅ No flag (3 posts in 7 days)
```

### Test 2: Active User (Monitor Only)
```
Day 1-7: 1 post each day
Result: 🟡 Monitor flag (7 posts, consecutive days)
```

### Test 3: Suspicious Pattern (Warning)
```
Day 1: 2 posts
Day 2: 2 posts
Day 3: 2 posts
Day 4: 2 posts
Day 5: 2 posts
Result: 🟠 Warning flag (10 posts in 5 days)
```

### Test 4: Clear Abuse (High Risk)
```
Day 1: 3 posts
Day 2: 3 posts  
Day 3: 3 posts
Result: 🔴 High Risk flag (9 posts in 3 days, 3+ per day)
```

---

## Benefits

✅ **Automatic Detection** - No manual monitoring needed  
✅ **Scalable** - Works for thousands of users  
✅ **Fair** - Clear thresholds, not arbitrary  
✅ **Actionable** - Admins can take immediate action  
✅ **Privacy-Friendly** - Internal only, users unaware  
✅ **Configurable** - Easy to adjust thresholds  
✅ **Data Driven** - Based on actual posting patterns  

---

## Future Enhancements

1. **ML-Based Detection** - Use machine learning to detect spam content
2. **Pattern Recognition** - Identify bot-like behavior (exact time intervals)
3. **Content Analysis** - Flag promotional or duplicate content
4. **User Appeals** - Allow flagged users to appeal restrictions
5. **Auto-Escalation** - Automatically escalate to higher flag levels
6. **Integration** - Connect with report system for cross-validation

---

## Summary

**What:** Automated system to detect users posting excessively  
**Why:** Prevent spam, bots, and system abuse  
**How:** Track posting patterns, flag suspicious behavior, enable admin action  
**Impact:** Keeps platform quality high, reduces manual moderation  

**Next Steps:**
1. Review and approve this plan
2. Create database schema
3. Implement detection logic
4. Test with sample data
5. Deploy gradually (start with monitoring only)

---

**Status:** 📋 Planning Phase  
**Priority:** Medium  
**Estimated Time:** 2-3 weeks  
**Dependencies:** Database access, Admin authentication
