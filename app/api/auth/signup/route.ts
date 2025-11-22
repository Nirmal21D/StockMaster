import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['OPERATOR', 'MANAGER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be OPERATOR or MANAGER' },
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

    // Create user with PENDING status and requested role
    const user = await User.create({
      name,
      email,
      password: passwordHash,
      status: 'PENDING',
      role: role, // Store the requested role
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

