import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Adjustment from '@/lib/models/Adjustment';
import StockLevel from '@/lib/models/StockLevel';
import { requireAuth } from '@/lib/middleware';
import { updateStock } from '@/lib/services/stockService';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');

    const query: any = {};

    // For Operators, filter by assigned warehouses
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      query.warehouseId = { $in: assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (productId) {
      query.productId = new mongoose.Types.ObjectId(productId);
    }

    const adjustments = await Adjustment.find(query)
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name code')
      .populate('locationId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(adjustments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const { productId, warehouseId, locationId, newQuantity, reason, remarks } = body;

    if (!productId || !warehouseId || newQuantity === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For Operators, verify they have access to this warehouse
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(warehouseId)) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    // Get current stock level
    const stockLevel = await StockLevel.findOne({
      productId: new mongoose.Types.ObjectId(productId),
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      locationId: locationId ? new mongoose.Types.ObjectId(locationId) : null,
    });

    const oldQuantity = stockLevel?.quantity || 0;
    const difference = newQuantity - oldQuantity;

    // Generate adjustment number
    const count = await Adjustment.countDocuments();
    const adjustmentNumber = `ADJ-${String(count + 1).padStart(4, '0')}`;

    // Create adjustment
    const adjustment = await Adjustment.create({
      adjustmentNumber,
      productId: new mongoose.Types.ObjectId(productId),
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      locationId: locationId ? new mongoose.Types.ObjectId(locationId) : undefined,
      oldQuantity,
      newQuantity,
      difference,
      reason,
      remarks,
      createdBy: new mongoose.Types.ObjectId((session.user as any).id),
    });

    // Update stock level and create ledger entry
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    await updateStock(
      adjustment.productId,
      adjustment.warehouseId,
      adjustment.locationId,
      difference,
      'ADJUSTMENT',
      'ADJUSTMENT',
      new mongoose.Types.ObjectId(adjustment._id.toString()),
      userId
    );

    const populated = await Adjustment.findById(adjustment._id)
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name code')
      .populate('locationId', 'name code')
      .populate('createdBy', 'name email');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

