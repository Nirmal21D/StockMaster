import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    let query: FirebaseFirestore.Query = adminDb.collection('locations').where('isActive', '==', true);

    if (warehouseId) {
      query = query.where('warehouseId', '==', warehouseId);
    }

    const snapshot = await query.get();
    let locations = snapshot.docs.map(doc => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data()
    }));

    // Sort in memory to avoid missing index errors in Firebase
    locations.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json(locations);
  } catch (error: any) {
    // If indexing error, we just fallback to returning the error
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, warehouseId } = body;

    if (!name || !warehouseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const locationData = {
      name,
      code: code || '',
      description: description || '',
      warehouseId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('locations').add(locationData);

    return NextResponse.json({ _id: docRef.id, ...locationData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

