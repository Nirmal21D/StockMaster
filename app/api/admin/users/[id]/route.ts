import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const user = await User.findById(params.id)
      .populate('assignedWarehouses', 'name code')
      .populate('primaryWarehouseId', 'name code');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const {
      name,
      email,
      role,
      status,
      assignedWarehouses,
      primaryWarehouseId,
      password,
    } = body;

    const updateData: any = {};

    // Validate warehouse assignment for operators and managers
    if (role && (role === 'OPERATOR' || role === 'MANAGER') && assignedWarehouses !== undefined) {
      if (!assignedWarehouses || assignedWarehouses.length !== 1) {
        return NextResponse.json(
          { error: 'Operators and Managers must be assigned to exactly one warehouse' },
          { status: 400 }
        );
      }
    }

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (assignedWarehouses !== undefined) {
      updateData.assignedWarehouses = assignedWarehouses.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
    }
    if (primaryWarehouseId !== undefined) {
      updateData.primaryWarehouseId = primaryWarehouseId
        ? new mongoose.Types.ObjectId(primaryWarehouseId)
        : null;
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 10);
    }

    // If changing role to MANAGER, require confirmation
    const existingUser = await User.findById(params.id);
    if (existingUser && role === 'MANAGER' && existingUser.role !== 'MANAGER') {
      if (!body.confirmManager) {
        return NextResponse.json(
          {
            error:
              'Changing role to MANAGER requires confirmation. Please set confirmManager: true in the request body.',
          },
          { status: 400 }
        );
      }
    }

    const user = await User.findByIdAndUpdate(params.id, updateData, { new: true })
      .populate('assignedWarehouses', 'name code')
      .populate('primaryWarehouseId', 'name code');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const user = await User.findByIdAndUpdate(
      params.id,
      { status: 'INACTIVE', isActive: false },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

