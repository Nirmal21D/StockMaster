import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

async function seedMinimal() {
  console.log('--- SEEDING MINIMAL RESILIENCY DATA ---');

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
     await db.collection('users').doc(u.uid).set(u, { merge: true });
     console.log(`✅ User set: ${u.email}`);
  }

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

  await db.collection('shipments').doc(shipment.id).set(shipment);
  console.log(`✅ Shipment set: ${shipment.id}`);

  console.log('--- MINIMAL SEED COMPLETE ---');
}

seedMinimal().catch(console.error);
