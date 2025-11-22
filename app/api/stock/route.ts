import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockLevel from '@/lib/models/StockLevel';
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
    const locationId = searchParams.get('locationId');

    if (!productId || !warehouseId) {
      return NextResponse.json({ error: 'productId and warehouseId are required' }, { status: 400 });
    }

    const query: any = {
      productId: new mongoose.Types.ObjectId(productId),
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
    };

    if (locationId) {
      query.locationId = new mongoose.Types.ObjectId(locationId);
    } else {
      query.locationId = null;
    }

    const stockLevel = await StockLevel.findOne(query);

    return NextResponse.json({
      quantity: stockLevel?.quantity || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

