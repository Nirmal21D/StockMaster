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

    const warehouse = await getDocument<any>('warehouses', params.id);
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    return NextResponse.json(warehouse);
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
    
    const userRole = (session as any)?.user?.role || (session as any)?.role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const existing = await getDocument('warehouses', params.id);
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    const updateData = { ...body, updatedAt: new Date().toISOString() };
    await updateDocument('warehouses', params.id, updateData);
    const updatedWarehouse = await getDocument<any>('warehouses', params.id);

    return NextResponse.json(updatedWarehouse);
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
    
    const userRole = (session as any)?.user?.role || (session as any)?.role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getDocument('warehouses', params.id);
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    await updateDocument('warehouses', params.id, {
      isActive: false,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Warehouse deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

