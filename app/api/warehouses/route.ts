import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehousesSnapshot = await adminDb
      .collection('warehouses')
      .where('isActive', '==', true)
      .get();
      
    const warehouses = warehousesSnapshot.docs
      .map(doc => ({
        _id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));

    return NextResponse.json(warehouses);
  } catch (error: any) {
    console.error('Failed to fetch warehouses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    const userRole = (session as any)?.user?.role || (session as any)?.role;
    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, address, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing code
    const existing = await adminDb.collection('warehouses').where('code', '==', code).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 400 });
    }

    const warehouseData = {
      name,
      code,
      address: address || '',
      description: description || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('warehouses').add(warehouseData);
    
    return NextResponse.json({ _id: docRef.id, ...warehouseData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

