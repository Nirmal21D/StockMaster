import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const { role, assignedWarehouses, primaryWarehouseId } = body;

    if (!role || !assignedWarehouses || assignedWarehouses.length === 0) {
      return NextResponse.json(
        {
          error:
            'Role and at least one assigned warehouse are required for approval',
        },
        { status: 400 }
      );
    }

    if (role !== 'MANAGER' && role !== 'OPERATOR') {
      return NextResponse.json(
        { error: 'Role must be MANAGER or OPERATOR' },
        { status: 400 }
      );
    }

    // If assigning MANAGER role, require confirmation
    if (role === 'MANAGER' && !body.confirmManager) {
      return NextResponse.json(
        {
          error:
            'Assigning MANAGER role requires confirmation. Please set confirmManager: true in the request body.',
        },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: 'ACTIVE',
      role,
      assignedWarehouses: assignedWarehouses.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      ),
      isActive: true,
    };

    if (primaryWarehouseId) {
      updateData.primaryWarehouseId = new mongoose.Types.ObjectId(primaryWarehouseId);
    } else if (assignedWarehouses.length === 1) {
      // Auto-set primary warehouse if only one assigned
      updateData.primaryWarehouseId = new mongoose.Types.ObjectId(assignedWarehouses[0]);
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

