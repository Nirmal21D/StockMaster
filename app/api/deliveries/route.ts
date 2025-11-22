import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Delivery from '@/lib/models/Delivery';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
import { generateReferenceNumber } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = {};

    if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { deliveryNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    const deliveries = await Delivery.find(query)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(deliveries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    if (!['ADMIN', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      customerName,
      deliveryAddress,
      warehouseId,
      reference,
      notes,
      lines,
      status,
      scheduleDate,
      responsible,
    } = body;

    if (!warehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate delivery number
    const count = await Delivery.countDocuments({ warehouseId });
    const deliveryNumber = generateReferenceNumber('WH', warehouse.code, 'OUT', count + 1);

    const delivery = await Delivery.create({
      deliveryNumber,
      customerName,
      deliveryAddress,
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      reference,
      notes,
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        fromLocationId: line.fromLocationId
          ? new mongoose.Types.ObjectId(line.fromLocationId)
          : undefined,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
      responsible: responsible || (session.user as any).name,
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.fromLocationId', 'name code');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

