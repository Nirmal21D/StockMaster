import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockMovement from '@/lib/models/StockMovement';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};

    // For Operators, filter by assigned warehouses
    const userRole = (session.user as any)?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      const warehouseIds = assignedWarehouses.map((id: string) => new mongoose.Types.ObjectId(id));
      query.$or = [
        { warehouseFromId: { $in: warehouseIds } },
        { warehouseToId: { $in: warehouseIds } },
      ];
    } else if (warehouseId) {
      query.$or = [
        { warehouseFromId: new mongoose.Types.ObjectId(warehouseId) },
        { warehouseToId: new mongoose.Types.ObjectId(warehouseId) },
      ];
    }

    if (productId) {
      query.productId = new mongoose.Types.ObjectId(productId);
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('productId', 'name sku')
      .populate('warehouseFromId', 'name code')
      .populate('warehouseToId', 'name code')
      .populate('locationFromId', 'name code')
      .populate('locationToId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await StockMovement.countDocuments(query);

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

