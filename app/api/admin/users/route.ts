import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const warehouseId = searchParams.get('warehouseId');

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (role) {
      query.role = role;
    }
    if (warehouseId) {
      query.assignedWarehouses = new mongoose.Types.ObjectId(warehouseId);
    }

    const users = await User.find(query)
      .populate('assignedWarehouses', 'name code')
      .populate('primaryWarehouseId', 'name code')
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const { name, email, password, role, status, assignedWarehouses, primaryWarehouseId } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate warehouse assignment for operators and managers
    if (role && (role === 'OPERATOR' || role === 'MANAGER')) {
      if (!assignedWarehouses || assignedWarehouses.length !== 1) {
        return NextResponse.json(
          { error: 'Operators and Managers must be assigned to exactly one warehouse' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: passwordHash,
      role: role || null,
      status: status || 'ACTIVE',
      assignedWarehouses: assignedWarehouses || [],
      primaryWarehouseId: primaryWarehouseId || null,
      isActive: true,
    });

    const populatedUser = await User.findById(user._id)
      .populate('assignedWarehouses', 'name code')
      .populate('primaryWarehouseId', 'name code');

    return NextResponse.json(populatedUser, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

