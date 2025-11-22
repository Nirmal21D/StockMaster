// Test script for forgot password functionality
// Run with: tsx scripts/test-forgot-password.ts

import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import User from '../lib/models/User';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testForgotPassword() {
  try {
    console.log('🔧 Testing Forgot Password Functionality...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find a test user (or create one)
    let testUser = await User.findOne({ email: 'admin@stockmaster.com' });
    
    if (!testUser) {
      console.log('❌ Test user not found. Please run the seed script first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);

    // Test the forgot password API logic
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    testUser.resetToken = resetToken;
    testUser.resetTokenExpiry = resetTokenExpiry;
    await testUser.save();

    console.log(`✅ Generated reset token: ${resetToken}`);
    console.log(`✅ Token expires at: ${resetTokenExpiry}`);

    // Test reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    console.log(`✅ Reset URL: ${resetUrl}`);

    // Test token verification
    const verifyUser = await User.findOne({
      resetToken: resetToken,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (verifyUser) {
      console.log('✅ Token verification successful');
    } else {
      console.log('❌ Token verification failed');
    }

    console.log('\n🎉 Forgot Password functionality test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit: http://localhost:3000/auth/signin');
    console.log('3. Click "Forget Password?" link');
    console.log('4. Enter email: admin@stockmaster.com');
    console.log('5. Check console for reset link');
    console.log('6. Visit the reset link to set new password');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testForgotPassword();