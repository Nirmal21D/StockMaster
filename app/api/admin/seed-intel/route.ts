import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('--- TRIGGERING IN-APP INTELLIGENCE SEEDING ---');

    // 1. Seed Users
    const users = [
      {
         uid: 'USER_VND_PHARMA',
         email: 'pharma@supplymind.ai',
         name: 'Lifeline Pharma Hub',
         role: 'VENDOR',
         vendorId: 'VND_PHARMA_01',
         status: 'APPROVED'
      },
      {
         uid: 'USER_PTR_DISPATCH',
         email: 'driver@supplymind.ai',
         name: 'Global Pro Dispatcher',
         role: 'TRANSPORT',
         partnerId: 'PTR_DISPATCH_01',
         status: 'APPROVED'
      }
    ];

    for (const u of users) {
       await adminDb.collection('users').doc(u.uid).set(u, { merge: true });
    }

    // 2. Seed Shipment
    const shipment = {
      id: 'LIFE-PHARMA-001',
      shipmentId: 'LIFE-PHARMA-001',
      type: 'INTERNATIONAL',
      status: 'IN_TRANSIT',
      origin: { type: 'VENDOR', name: 'Lifeline Pharma Hub', vendorId: 'VND_PHARMA_01' },
      destination: { type: 'WAREHOUSE', warehouseId: 'WH_MOCK_3', name: 'Mumbai Hub' },
      cargo: [
        { productId: '47Mxwn03gEvDVYoNiRiP', quantity: 1000, name: 'Critical Insulin Stock' }
      ],
      riskScore: 68,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(Date.now() + 12 * 3600000).toISOString(),
      vendorReliabilityScore: 94
    };

    await adminDb.collection('shipments').doc(shipment.id).set(shipment);

    return NextResponse.json({ success: true, message: 'Lifeline Pharma and Transport users seeded successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
