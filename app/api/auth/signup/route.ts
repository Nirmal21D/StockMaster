import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password, note } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with PENDING status and null role (no power yet)
    const user = await User.create({
      name,
      email,
      password: passwordHash,
      status: 'PENDING',
      role: null, // No role assigned yet - admin will assign during approval
      assignedWarehouses: [],
      isActive: true,
    });

    return NextResponse.json(
      {
        message: 'Registration successful. Your account is pending approval by an administrator.',
        userId: user._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}

