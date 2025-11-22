import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Requisition from '@/lib/models/Requisition';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const requisition = await Requisition.findById(params.id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('finalSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.productId', 'name sku unit');

    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    return NextResponse.json(requisition);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const requisition = await Requisition.findById(params.id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (requisition.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update requisition that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Requisition.findByIdAndUpdate(params.id, body, { new: true })
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku');

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    const action = (await request.json()).action; // 'submit', 'approve', 'reject'

    await connectDB();

    const requisition = await Requisition.findById(params.id);
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as any).id);

    if (action === 'submit') {
      if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (requisition.status !== 'DRAFT') {
        return NextResponse.json(
          { error: 'Can only submit DRAFT requisitions' },
          { status: 400 }
        );
      }

      requisition.status = 'SUBMITTED';
      await requisition.save();
    } else if (action === 'approve') {
      if (!['ADMIN', 'MANAGER'].includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (requisition.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only approve SUBMITTED requisitions' },
          { status: 400 }
        );
      }

      const body = await request.json();
      requisition.status = 'APPROVED';
      requisition.approvedBy = userId;
      requisition.approvedAt = new Date();
      if (body.finalSourceWarehouseId) {
        requisition.finalSourceWarehouseId = new mongoose.Types.ObjectId(
          body.finalSourceWarehouseId
        );
      }
      await requisition.save();
    } else if (action === 'reject') {
      if (!['ADMIN', 'MANAGER'].includes(userRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (requisition.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only reject SUBMITTED requisitions' },
          { status: 400 }
        );
      }

      const body = await request.json();
      requisition.status = 'REJECTED';
      requisition.rejectedReason = body.reason || 'Rejected by manager';
      await requisition.save();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const populated = await Requisition.findById(requisition._id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('finalSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.productId', 'name sku');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

