import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';
import EmailService from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return success even if user not found (security best practice)
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    // Send email using Resend
    const emailSent = await EmailService.sendForgotPasswordEmail(
      email,
      user.name,
      resetUrl
    );

    // For development, log the reset link
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 Password Reset Link for', email, ':', resetUrl);
      console.log('📧 Reset token expires at:', resetTokenExpiry);
      console.log('📬 Email sent via Resend:', emailSent ? 'Success' : 'Failed');
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}