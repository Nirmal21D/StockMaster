import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Receipt from '@/lib/models/Receipt';
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

    // For Operators, filter by assigned warehouses
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      query.warehouseId = { $in: assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    const receipts = await Receipt.find(query)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.locationId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(receipts);
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
    const { supplierName, warehouseId, reference, notes, lines, status } = body;

    if (!warehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For Operators, verify they have access to this warehouse
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(warehouseId)) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate receipt number
    const count = await Receipt.countDocuments({ warehouseId });
    const receiptNumber = generateReferenceNumber('WH', warehouse.code, 'IN', count + 1);

    const receipt = await Receipt.create({
      receiptNumber,
      supplierName,
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      reference,
      notes,
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        locationId: line.locationId ? new mongoose.Types.ObjectId(line.locationId) : undefined,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Receipt.findById(receipt._id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.locationId', 'name code');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

