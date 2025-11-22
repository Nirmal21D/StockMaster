# 🔑 Forgot Password Feature - StockMaster

## Overview

The forgot password feature allows users to reset their passwords securely using a time-limited token-based system.

## How It Works

1. **Request Reset**: User enters their email on the forgot password page
2. **Token Generation**: System generates a unique reset token (valid for 1 hour)
3. **Email Notification**: Reset link is sent to user's email (logged to console in development)
4. **Password Reset**: User clicks link and sets new password
5. **Token Cleanup**: Reset token is cleared after successful password reset

## Features

- ✅ Secure token-based password reset
- ✅ Token expiration (1 hour)
- ✅ Email validation and user verification
- ✅ Password strength requirements (minimum 6 characters)
- ✅ Password confirmation validation
- ✅ Automatic redirect after successful reset
- ✅ Error handling for invalid/expired tokens
- ✅ Development-friendly console logging

## File Structure

```
app/
├── api/auth/
│   ├── forgot-password/route.ts    # API for requesting password reset
│   └── reset-password/route.ts     # API for resetting password
├── auth/
│   ├── forgot-password/page.tsx    # Request reset form
│   └── reset-password/page.tsx     # Reset password form
lib/
├── models/User.ts                  # Updated with reset token fields
└── services/emailService.ts        # Email service utility
scripts/
└── test-forgot-password.ts         # Test script
```

## Usage

### For Users

1. Go to sign-in page: `http://localhost:3000/auth/signin`
2. Click "Forget Password?" link
3. Enter your email address
4. Check console for reset link (in development mode)
5. Click the reset link to set new password

### For Developers

```bash
# Test the functionality
npm run test-forgot-password

# Start development server
npm run dev
```

### Testing Flow

1. **Request Password Reset**
   ```
   POST /api/auth/forgot-password
   {
     "email": "admin@stockmaster.com"
   }
   ```

2. **Verify Token** (optional)
   ```
   GET /api/auth/reset-password?token=<reset_token>
   ```

3. **Reset Password**
   ```
   POST /api/auth/reset-password
   {
     "token": "<reset_token>",
     "password": "newpassword123"
   }
   ```

## Database Changes

Added to `User` model:
- `resetToken?: string` - Unique reset token
- `resetTokenExpiry?: Date` - Token expiration timestamp

## Security Features

- **Token Uniqueness**: Uses crypto.randomBytes(32) for secure tokens
- **Time Expiration**: Tokens expire after 1 hour
- **Single Use**: Tokens are cleared after successful password reset
- **Email Validation**: Only sends reset links to existing user emails
- **Password Hashing**: New passwords are bcrypt hashed
- **Rate Limiting Ready**: Structure allows easy addition of rate limiting

## Email Configuration

### Current Implementation: Resend
The forgot password feature now uses **Resend** for email delivery with React email templates.

#### Development Mode
- Emails are logged to console for debugging
- If `RESEND_API_KEY` is configured, actual emails are also sent

#### Production Setup
1. **Sign up at [Resend](https://resend.com/)**
2. **Get your API key** 
3. **Configure environment variables:**
   ```env
   RESEND_API_KEY="your-resend-api-key"
   FROM_EMAIL="StockMaster <noreply@yourdomain.com>"
   ```

#### Features
- ✅ **React Email Templates**: Professional HTML emails with JSX
- ✅ **Reliable Delivery**: Industry-leading email delivery rates  
- ✅ **Modern API**: Simple, developer-friendly interface
- ✅ **Automatic Fallback**: Graceful degradation in development

#### Email Template
The system uses a React component (`ForgotPasswordEmail`) for consistent, professional email formatting with:
- StockMaster branding
- Responsive design
- Clear call-to-action button
- Backup text link
- Security information

## Environment Variables

Current (development):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-secret"
MONGODB_URI="your-mongodb-connection"
```

Production configuration:
```env
# Resend Email Service
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="StockMaster <noreply@yourdomain.com>"
```

Optional for development testing:
```env
# Add these to test real email sending in development
RESEND_API_KEY="your-resend-api-key" 
FROM_EMAIL="StockMaster <noreply@yourdomain.com>"
```

## Error Handling

- Invalid email format: Client-side validation
- User not found: Security-friendly response (doesn't reveal if email exists)
- Expired token: Clear error message with link to request new reset
- Invalid token: Redirect to request new reset
- Password validation: Minimum length and confirmation matching

## Future Enhancements

- [ ] Rate limiting for forgot password requests
- [ ] Email templates with company branding
- [ ] SMS-based password reset option
- [ ] Password history (prevent reusing recent passwords)
- [ ] Account lockout after multiple failed reset attempts
- [ ] Admin notifications for password reset activities
- [ ] Audit logging for security events

## Testing

```bash
# Test the forgot password functionality
npm run test-forgot-password

# Test Resend email service specifically
npm run test-resend-email

# Manual testing steps:
1. Ensure user exists (run: npm run seed)
2. Visit /auth/signin
3. Click "Forget Password?"
4. Enter: admin@stockmaster.com
5. Check console for reset link (and email if Resend configured)
6. Visit reset link
7. Set new password
8. Login with new password
```

## Troubleshooting

**Token not found/expired:**
- Check if token was copied correctly from console
- Verify token hasn't expired (1 hour limit)
- Run test script to generate fresh token

**Email not working:**
- In development, emails are logged to console
- Check console output for reset links
- Verify NEXTAUTH_URL is correct in .env.local

**Database issues:**
- Ensure MongoDB is running
- Check connection string in .env.local
- Run: npm run test-db

## API Responses

### Successful Request
```json
{
  "message": "If an account with that email exists, a reset link has been sent."
}
```

### Successful Reset
```json
{
  "message": "Password has been reset successfully"
}
```

### Error Examples
```json
{
  "error": "Invalid or expired reset token"
}
```

---

This forgot password feature is production-ready with proper security measures and can be easily extended with real email services for production deployment.