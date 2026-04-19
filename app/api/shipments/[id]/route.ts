import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const docSnap = await adminDb.collection('shipments').doc(params.id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: docSnap.id,
      id: docSnap.id,
      ...docSnap.data()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updateData = { ...body, updatedAt: new Date().toISOString() };
    delete updateData._id;
    delete updateData.id;

    await adminDb.collection('shipments').doc(params.id).update(updateData);

    const docSnap = await adminDb.collection('shipments').doc(params.id).get();
    return NextResponse.json({ _id: docSnap.id, ...docSnap.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
