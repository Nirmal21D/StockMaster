import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transfer from '@/lib/models/Transfer';
import Warehouse from '@/lib/models/Warehouse';
import Requisition from '@/lib/models/Requisition';
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
      query.$or = [
        { sourceWarehouseId: new mongoose.Types.ObjectId(warehouseId) },
        { targetWarehouseId: new mongoose.Types.ObjectId(warehouseId) },
      ];
    }

    if (status) {
      query.status = status;
    }

    const transfers = await Transfer.find(query)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const userRole = (session.user as any)?.role;
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      requisitionId,
      sourceWarehouseId,
      targetWarehouseId,
      lines,
      status,
    } = body;

    if (!sourceWarehouseId || !targetWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate warehouses
    const sourceWarehouse = await Warehouse.findById(sourceWarehouseId);
    const targetWarehouse = await Warehouse.findById(targetWarehouseId);

    if (!sourceWarehouse || !targetWarehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // If linked to requisition, validate it
    if (requisitionId) {
      const requisition = await Requisition.findById(requisitionId);
      if (!requisition || requisition.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Requisition must be APPROVED to create transfer' },
          { status: 400 }
        );
      }
    }

    // Generate transfer number
    const count = await Transfer.countDocuments();
    const transferNumber = `TRF-${String(count + 1).padStart(4, '0')}`;

    const transfer = await Transfer.create({
      transferNumber,
      requisitionId: requisitionId ? new mongoose.Types.ObjectId(requisitionId) : undefined,
      sourceWarehouseId: new mongoose.Types.ObjectId(sourceWarehouseId),
      targetWarehouseId: new mongoose.Types.ObjectId(targetWarehouseId),
      lines: lines.map((line: any) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        sourceLocationId: line.sourceLocationId
          ? new mongoose.Types.ObjectId(line.sourceLocationId)
          : undefined,
        targetLocationId: line.targetLocationId
          ? new mongoose.Types.ObjectId(line.targetLocationId)
          : undefined,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    const populated = await Transfer.findById(transfer._id)
      .populate('sourceWarehouseId', 'name code')
      .populate('targetWarehouseId', 'name code')
      .populate('requisitionId', 'requisitionNumber')
      .populate('createdBy', 'name email')
      .populate('lines.productId', 'name sku')
      .populate('lines.sourceLocationId', 'name code')
      .populate('lines.targetLocationId', 'name code');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

