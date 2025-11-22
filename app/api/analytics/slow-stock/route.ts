import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import StockLevel from '@/lib/models/StockLevel';
import StockMovement from '@/lib/models/StockMovement';
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

    const stockHealth: any[] = [];

    for (const product of products) {
      // Find stock levels for this product
      const stockQuery: any = { productId: product._id };
      if (warehouseId) {
        stockQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);
      }

      const stockLevels = await StockLevel.find(stockQuery);

      for (const stockLevel of stockLevels) {
        // Find last movement for this product+warehouse+location
        const lastMovement = await StockMovement.findOne({
          productId: product._id,
          $or: [
            { warehouseFromId: stockLevel.warehouseId },
            { warehouseToId: stockLevel.warehouseId },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(1);

        const daysSinceLastMovement = lastMovement
          ? Math.floor((Date.now() - lastMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let category = 'UNKNOWN';
        if (daysSinceLastMovement === null) {
          category = 'NO_MOVEMENT';
        } else if (daysSinceLastMovement < 30) {
          category = 'ACTIVE';
        } else if (daysSinceLastMovement < 90) {
          category = 'SLOW';
        } else {
          category = 'DEAD';
        }

        stockHealth.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          warehouseId: stockLevel.warehouseId,
          locationId: stockLevel.locationId,
          quantity: stockLevel.quantity,
          daysSinceLastMovement,
          category,
        });
      }
    }

    // Filter by category if needed
    const category = searchParams.get('category');
    const filtered = category
      ? stockHealth.filter((item) => item.category === category)
      : stockHealth;

    return NextResponse.json({
      stockHealth: filtered,
      summary: {
        active: filtered.filter((item) => item.category === 'ACTIVE').length,
        slow: filtered.filter((item) => item.category === 'SLOW').length,
        dead: filtered.filter((item) => item.category === 'DEAD').length,
        noMovement: filtered.filter((item) => item.category === 'NO_MOVEMENT').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

