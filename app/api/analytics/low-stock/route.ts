import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import StockLevel from '@/lib/models/StockLevel';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    // Get all active products
    const products = await Product.find({ isActive: true });

    const lowStockItems: any[] = [];

    for (const product of products) {
      let totalQuantity = 0;

      if (warehouseId) {
        // Sum stock for specific warehouse
        const stockLevels = await StockLevel.find({
          productId: product._id,
          warehouseId: new mongoose.Types.ObjectId(warehouseId),
        });
        totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
      } else {
        // Sum stock across all warehouses
        const stockLevels = await StockLevel.find({
          productId: product._id,
        });
        totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
      }

      if (totalQuantity < product.reorderLevel) {
        lowStockItems.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          currentStock: totalQuantity,
          reorderLevel: product.reorderLevel,
          deficit: product.reorderLevel - totalQuantity,
        });
      }
    }

    return NextResponse.json({ lowStockItems, count: lowStockItems.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

