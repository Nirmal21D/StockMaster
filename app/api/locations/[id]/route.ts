import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { getDocument, updateDocument } from '@/lib/firebase/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const location = await getDocument<any>('locations', params.id);
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

    // Load warehouse for populated data equivalent
    if (location.warehouseId) {
      const warehouse = await getDocument<any>('warehouses', location.warehouseId);
      if (warehouse) {
        location.warehouseId = { _id: location.warehouseId, name: warehouse.name, code: warehouse.code };
      }
    }

    return NextResponse.json(location);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if ((session as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const existing = await getDocument('locations', params.id);
    if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

    const updateData = { ...body, updatedAt: new Date().toISOString() };
    await updateDocument('locations', params.id, updateData);
    const updatedLocation = await getDocument<any>('locations', params.id);

    return NextResponse.json(updatedLocation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if ((session as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getDocument('locations', params.id);
    if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

    await updateDocument('locations', params.id, {
      isActive: false,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Location deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

