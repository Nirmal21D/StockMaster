import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockLevel from '@/lib/models/StockLevel';
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

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    const query: any = {
      productId: new mongoose.Types.ObjectId(params.id),
    };

    if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    const stockLevels = await StockLevel.find(query)
      .populate('warehouseId', 'name code')
      .populate('locationId', 'name code')
      .sort({ warehouseId: 1, locationId: 1 });

    // Group by warehouse
    const groupedByWarehouse: Record<string, any> = {};
    let totalQuantity = 0;

    for (const level of stockLevels) {
      const warehouseId = (level.warehouseId as any)?._id.toString();
      if (!groupedByWarehouse[warehouseId]) {
        groupedByWarehouse[warehouseId] = {
          warehouse: level.warehouseId,
          locations: [],
          total: 0,
        };
      }

      groupedByWarehouse[warehouseId].locations.push({
        location: level.locationId,
        quantity: level.quantity,
        updatedAt: level.updatedAt,
      });

      groupedByWarehouse[warehouseId].total += level.quantity;
      totalQuantity += level.quantity;
    }

    return NextResponse.json({
      productId: params.id,
      totalQuantity,
      byWarehouse: Object.values(groupedByWarehouse),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

