import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Location from '@/lib/models/Location';
import { requireAuth, requireRole } from '@/lib/middleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    const query: any = { isActive: true };

    if (warehouseId) {
      query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    const locations = await Location.find(query)
      .populate('warehouseId', 'name code')
      .sort({ name: 1 });

    return NextResponse.json(locations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ['ADMIN']);
    if (session instanceof NextResponse) return session;

    await connectDB();

    const body = await request.json();
    const { name, code, description, warehouseId } = body;

    if (!name || !warehouseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const location = await Location.create({
      name,
      code,
      description,
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

