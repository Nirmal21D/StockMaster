// Test script for Resend email functionality
// Run with: tsx scripts/test-resend-email.ts

import dotenv from 'dotenv';
import EmailService from '../lib/services/emailService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testResendEmail() {
  try {
    console.log('🔧 Testing Resend Email Service...\n');

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not found in .env.local');
      console.log('📝 To test with real emails:');
      console.log('1. Sign up at https://resend.com/');
      console.log('2. Get your API key');
      console.log('3. Add RESEND_API_KEY="your-key-here" to .env.local');
      console.log('4. Add FROM_EMAIL="Your Name <noreply@yourdomain.com>" to .env.local');
      console.log('\n🧪 Running in development mode (console logging only)...\n');
    } else {
      console.log('✅ Resend API key found');
      console.log('✅ From email:', process.env.FROM_EMAIL || 'Default Resend email');
      console.log('\n🚀 Testing real email sending...\n');
    }

    // Test data
    const testEmail = 'test@example.com'; // Change this to your email for testing
    const userName = 'Test User';
    const resetUrl = 'http://localhost:3000/auth/reset-password?token=test-token-123';

    console.log('📧 Test email details:');
    console.log('To:', testEmail);
    console.log('User:', userName);
    console.log('Reset URL:', resetUrl);

    // Test the forgot password email
    const emailSent = await EmailService.sendForgotPasswordEmail(
      testEmail,
      userName,
      resetUrl
    );

    if (emailSent) {
      console.log('\n✅ Email sent successfully!');
      if (process.env.RESEND_API_KEY) {
        console.log('📬 Check your email inbox for the password reset email');
      } else {
        console.log('📝 Email content logged to console (development mode)');
      }
    } else {
      console.log('\n❌ Email sending failed');
    }

    // Test the generic email service
    console.log('\n🧪 Testing generic email service...');
    
    const genericEmailSent = await EmailService.sendEmail({
      to: testEmail,
      subject: 'Test Email - StockMaster',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from StockMaster.</p>
        <p>If you receive this, Resend is working correctly!</p>
      `,
    });

    if (genericEmailSent) {
      console.log('✅ Generic email sent successfully!');
    } else {
      console.log('❌ Generic email sending failed');
    }

    console.log('\n🎉 Resend email test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure RESEND_API_KEY in .env.local for production emails');
    console.log('2. Test forgot password flow: npm run dev');
    console.log('3. Visit: http://localhost:3000/auth/forgot-password');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testResendEmail();