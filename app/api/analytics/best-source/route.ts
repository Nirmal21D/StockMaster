import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockLevel from '@/lib/models/StockLevel';
import Warehouse from '@/lib/models/Warehouse';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const excludeWarehouseId = searchParams.get('excludeWarehouseId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Find all stock levels for this product
    const query: any = {
      productId: new mongoose.Types.ObjectId(productId),
      quantity: { $gt: 0 },
    };

    if (excludeWarehouseId) {
      query.warehouseId = { $ne: new mongoose.Types.ObjectId(excludeWarehouseId) };
    }

    const stockLevels = await StockLevel.find(query)
      .populate('warehouseId', 'name code')
      .sort({ quantity: -1 });

    // Group by warehouse and sum quantities
    const warehouseStock: Record<string, any> = {};

    for (const stockLevel of stockLevels) {
      const warehouseId = (stockLevel.warehouseId as any)._id.toString();
      if (!warehouseStock[warehouseId]) {
        warehouseStock[warehouseId] = {
          warehouseId: (stockLevel.warehouseId as any)._id,
          warehouseName: (stockLevel.warehouseId as any).name,
          warehouseCode: (stockLevel.warehouseId as any).code,
          totalQuantity: 0,
        };
      }
      warehouseStock[warehouseId].totalQuantity += stockLevel.quantity;
    }

    // Convert to array and sort by quantity
    const suggestions = Object.values(warehouseStock).sort(
      (a: any, b: any) => b.totalQuantity - a.totalQuantity
    );

    return NextResponse.json({
      productId,
      suggestions,
      bestSource: suggestions.length > 0 ? suggestions[0] : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

