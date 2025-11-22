import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Requisition from '@/lib/models/Requisition';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');

    const query: any = {};

    if (warehouseId) {
      query.requestingWarehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (status) {
      query.status = status;
    }

    const requisitions = await Requisition.find(query)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('finalSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.productId', 'name sku')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(requisitions);
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
      requestingWarehouseId,
      suggestedSourceWarehouseId,
      lines,
      status,
    } = body;

    if (!requestingWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const warehouse = await Warehouse.findById(requestingWarehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate requisition number
    const count = await Requisition.countDocuments();
    const requisitionNumber = `REQ-${String(count + 1).padStart(4, '0')}`;

    const requisition = await Requisition.create({
      requisitionNumber,
      requestingWarehouseId: new mongoose.Types.ObjectId(requestingWarehouseId),
      suggestedSourceWarehouseId: suggestedSourceWarehouseId
        ? new mongoose.Types.ObjectId(suggestedSourceWarehouseId)
        : undefined,
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        quantityRequested: line.quantityRequested,
        neededByDate: line.neededByDate ? new Date(line.neededByDate) : undefined,
      })),
      status: status || 'DRAFT',
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Requisition.findById(requisition._id)
      .populate('requestingWarehouseId', 'name code')
      .populate('suggestedSourceWarehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

