import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockMovement from '@/lib/models/StockMovement';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Get delivery movements (outgoing stock) in the period
      const deliveryMovements = await StockMovement.find({
        type: 'DELIVERY',
        createdAt: { $gte: startDate },
      })
        .populate('productId', 'name sku')
        .sort({ createdAt: -1 })
        .limit(100);

      // Group by product and count events
      const stockoutEvents: Record<string, any> = {};

      for (const movement of deliveryMovements) {
        const productId = movement.productId.toString();
        if (!stockoutEvents[productId]) {
          stockoutEvents[productId] = {
            productId: movement.productId,
            productName: (movement.productId as any)?.name,
            sku: (movement.productId as any)?.sku,
            count: 0,
            lastEvent: movement.createdAt,
          };
        }
        stockoutEvents[productId].count++;
        if (movement.createdAt > stockoutEvents[productId].lastEvent) {
          stockoutEvents[productId].lastEvent = movement.createdAt;
        }
      }

      const events = Object.values(stockoutEvents).sort(
        (a: any, b: any) => b.count - a.count
      );

      return NextResponse.json({
        events,
        totalEvents: events.length,
        periodDays: days,
      });
    } catch (error) {
      // If StockMovements doesn't exist yet, return empty result
      return NextResponse.json({
        events: [],
        totalEvents: 0,
        periodDays: days,
        message: 'Stockout tracking not yet implemented',
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

