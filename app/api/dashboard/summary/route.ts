import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getDashboardData } from '@/lib/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const dashboardData = await getDashboardData(warehouseId);

    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard summary API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

