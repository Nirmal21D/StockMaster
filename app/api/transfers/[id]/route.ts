import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/lib/models/Transfer';
import { requireAuth } from '@/lib/middleware';
import { updateStock, checkStockAvailability } from '@/lib/services/stockService';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const transfer = await Transfer.findById(params.id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku unit')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json(transfer);
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

    const transfer = await Transfer.findById(params.id);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (transfer.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update transfer that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Transfer.findByIdAndUpdate(params.id, body, { new: true })
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

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
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const transfer = await Transfer.findById(params.id);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status === 'DONE') {
      return NextResponse.json({ error: 'Transfer already completed' }, { status: 400 });
    }

    // Check stock availability at source
    const stockIssues: any[] = [];
    for (const line of transfer.lines) {
      const stockCheck = await checkStockAvailability(
        line.productId,
        transfer.sourceWarehouseId,
        line.quantity,
        line.sourceLocationId
      );

      if (!stockCheck.available) {
        stockIssues.push({
          productId: line.productId,
          quantity: line.quantity,
          available: stockCheck.availableQuantity,
        });
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient stock at source warehouse',
          stockIssues,
        },
        { status: 400 }
      );
    }

    // Update stock: decrement from source, increment to target
    const userId = new mongoose.Types.ObjectId((session.user as any).id);

    for (const line of transfer.lines) {
      // Decrement from source
      await updateStock(
        line.productId,
        transfer.sourceWarehouseId,
        line.sourceLocationId,
        -line.quantity,
        'TRANSFER',
        'TRANSFER',
        transfer._id,
        userId,
        transfer.sourceWarehouseId,
        line.sourceLocationId,
        transfer.targetWarehouseId,
        line.targetLocationId
      );

      // Increment to target
      await updateStock(
        line.productId,
        transfer.targetWarehouseId,
        line.targetLocationId,
        line.quantity,
        'TRANSFER',
        'TRANSFER',
        transfer._id,
        userId,
        transfer.sourceWarehouseId,
        line.sourceLocationId,
        transfer.targetWarehouseId,
        line.targetLocationId
      );
    }

    // Update transfer status
    transfer.status = 'DONE';
    transfer.validatedBy = userId;
    transfer.receivedAt = new Date();
    await transfer.save();

    const populated = await Transfer.findById(transfer._id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

