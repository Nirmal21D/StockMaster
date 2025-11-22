import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Delivery from '@/lib/models/Delivery';
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

    const delivery = await Delivery.findById(params.id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku unit')
      .populate('lines.fromLocationId', 'name code');

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json(delivery);
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

    const delivery = await Delivery.findById(params.id);
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Only allow updates if status is DRAFT
    if (delivery.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update delivery that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await Delivery.findByIdAndUpdate(params.id, body, { new: true })
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

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

    const delivery = await Delivery.findById(params.id);
    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    if (delivery.status === 'DONE') {
      return NextResponse.json({ error: 'Delivery already validated' }, { status: 400 });
    }

    // Check stock availability for each line
    const stockIssues: any[] = [];
    for (const line of delivery.lines) {
      const stockCheck = await checkStockAvailability(
        line.productId,
        delivery.warehouseId,
        line.quantity,
        line.fromLocationId
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
          error: 'Insufficient stock',
          stockIssues,
        },
        { status: 400 }
      );
    }

    // Update stock for each line (decrement)
    const userId = new mongoose.Types.ObjectId((session.user as any).id);

    for (const line of delivery.lines) {
      await updateStock(
        line.productId,
        delivery.warehouseId,
        line.fromLocationId,
        -line.quantity,
        'DELIVERY',
        'DELIVERY',
        delivery._id,
        userId,
        delivery.warehouseId,
        line.fromLocationId
      );
    }

    // Update delivery status
    delivery.status = 'DONE';
    delivery.validatedBy = userId;
    delivery.validatedAt = new Date();
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

    return NextResponse.json(populated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

