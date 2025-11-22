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

    // Get all products with stock
    const stockQuery: any = {};
    if (warehouseId) {
      stockQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    const productsWithStock = await StockLevel.distinct('productId', stockQuery);
    const products = await Product.find({ _id: { $in: productsWithStock } });

    // If StockMovements exists, compute last movement dates
    let activeProducts: mongoose.Types.ObjectId[] = [];
    let slowProducts: mongoose.Types.ObjectId[] = [];
    let deadProducts: mongoose.Types.ObjectId[] = [];

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get products with recent movement (active)
      activeProducts = await StockMovement.distinct('productId', {
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Get products with movement 30-90 days ago (slow)
      slowProducts = await StockMovement.distinct('productId', {
        createdAt: { $gte: ninetyDaysAgo, $lt: thirtyDaysAgo },
      });

      // Products with no movement in last 90 days (dead)
      deadProducts = productsWithStock.filter(
        (pid) =>
          !activeProducts.some((ap) => ap.toString() === pid.toString()) &&
          !slowProducts.some((sp) => sp.toString() === pid.toString())
      );
    } catch (error) {
      // If StockMovements doesn't exist or has errors, use placeholder logic
      console.warn('StockMovements not available, using placeholder logic');
    }

    return NextResponse.json({
      activeCount: activeProducts.length,
      slowCount: slowProducts.length,
      deadCount: deadProducts.length,
      totalProducts: products.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

