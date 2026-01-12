# Gmail Setup Guide for Email Reports

## Quick Setup (3 Steps)

### Step 1: Enable 2-Factor Authentication

1. Go to: **https://myaccount.google.com/security**
2. Scroll down to "Signing in to Google"
3. Click **"2-Step Verification"**
4. Follow the prompts to enable it (usually phone verification)

### Step 2: Generate App Password

1. Go to: **https://myaccount.google.com/apppasswords**
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. **Select app:** Mail
3. **Select device:** Other (Custom name) → Type "Daytz Backend"
4. Click **GENERATE**
5. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

⚠️ **Important:** You won't see this password again! Copy it immediately.

### Step 3: Update .env File

Open your `.env` file and add these lines (or update if they exist):

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=abcdefghijklmnop
REPORT_EMAIL_FROM=your-actual-email@gmail.com
REPORT_EMAIL_TO=user_reports@daytz.com
```

**Replace:**
- `your-actual-email@gmail.com` → Your Gmail address
- `abcdefghijklmnop` → The 16-char app password (NO SPACES!)
- `user_reports@daytz.com` → Email where you want to receive reports

## Example Configuration

```env
# Example with fake data
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=john.doe@gmail.com
SMTP_PASS=xyzw abcd efgh ijkl      # Remove spaces!
REPORT_EMAIL_FROM=john.doe@gmail.com
REPORT_EMAIL_TO=reports@daytz.com
```

## Testing

### 1. Start Backend
```bash
cd Backend
npm run dev
```

Check console for:
```
EmailService: Nodemailer transporter initialized successfully
```

### 2. Test from App
1. Open app
2. Go to Stories
3. Click Report button
4. Select a reason
5. Submit

### 3. Check Email
- Go to `user_reports@daytz.com` inbox
- Look for email with subject like "Inappropriate Video..."

## Troubleshooting

### ❌ Error: "Invalid login"
**Solution:** 
- Make sure 2FA is enabled
- Generate a NEW app password
- Copy it WITHOUT spaces

### ❌ Error: "SMTP connection failed"
**Solution:**
- Check `SMTP_USER` is correct Gmail
- Check `SMTP_PORT=587` (not 465)
- Check `SMTP_SECURE=false`

### ❌ Email not receiving
**Solution:**
- Check spam folder
- Verify `REPORT_EMAIL_TO` address is correct
- Make sure that email exists and can receive mail

### ❌ Error: "Authentication failed"
**Solution:**
- App password might be expired
- Generate a new one from Google Account

## Security Reminders

✅ **DO:**
- Keep app password secret
- Use different app passwords for different apps
- Revoke old app passwords from Google Account settings

❌ **DON'T:**
- Share app password with anyone
- Commit `.env` file to Git
- Use your regular Gmail password (won't work!)

## Gmail Limits

- **Free Gmail:** ~500 emails per day
- **Google Workspace:** ~2000 emails per day

For high-volume apps, consider SendGrid or AWS SES.

## Alternative: Create Dedicated Gmail Account

If you want to use a separate email for reports:

1. Create new Gmail: `daytz.reports@gmail.com`
2. Enable 2FA on new account
3. Generate app password
4. Use in `.env`:
   ```env
   SMTP_USER=daytz.reports@gmail.com
   SMTP_PASS=new-app-password
   REPORT_EMAIL_FROM=daytz.reports@gmail.com
   ```

## Complete .env Example

```env
# Database
DATABASE_URL=postgresql://...

# Auth0
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...

# AWS/Vimeo (existing)
AWS_ACCESS_KEY_ID=...
VIMEO_ACCESS_TOKEN=...

# ✅ NEW: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
REPORT_EMAIL_FROM=your-email@gmail.com
REPORT_EMAIL_TO=user_reports@daytz.com
```

## Need Help?

Common issues:
1. **2FA not available?** Your account might be too new. Wait 24 hours.
2. **App Passwords option missing?** Make sure 2FA is fully enabled.
3. **Still not working?** Try creating a fresh Gmail account for testing.

---

**Setup Time:** ~5 minutes  
**Difficulty:** Easy ⭐  
**Cost:** Free (Gmail)
