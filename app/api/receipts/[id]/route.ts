import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
import { requireAuth } from '@/lib/middleware';
import { updateStock } from '@/lib/services/stockService';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const receipt = await Receipt.findById(params.id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku unit')
      .populate('lines.locationId', 'name code');

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json(receipt);
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

    const receipt = await Receipt.findById(params.id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (receipt.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update receipt that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Receipt.findByIdAndUpdate(params.id, body, { new: true })
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.locationId', 'name code');

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
    if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const receipt = await Receipt.findById(params.id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (receipt.status === 'DONE') {
      return NextResponse.json({ error: 'Receipt already validated' }, { status: 400 });
    }

    // Update stock for each line
    const userId = new mongoose.Types.ObjectId((session.user as any).id);

    for (const line of receipt.lines) {
      await updateStock(
        line.productId,
        receipt.warehouseId,
        line.locationId,
        line.quantity,
        'RECEIPT',
        'RECEIPT',
        new mongoose.Types.ObjectId(receipt._id.toString()),
        userId,
        undefined,
        undefined,
        receipt.warehouseId,
        line.locationId
      );
    }

    // Update receipt status
    receipt.status = 'DONE';
    receipt.validatedBy = userId;
    receipt.validatedAt = new Date();
    await receipt.save();

    const populated = await Receipt.findById(receipt._id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.locationId', 'name code');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

