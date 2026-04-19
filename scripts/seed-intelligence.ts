
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

async function seedIntelligence() {
  console.log('--- SEEDING SUPPLYMIND INTELLIGENCE ---');

  const products = ['47Mxwn03gEvDVYoNiRiP', '6sL2YPrB5m3V2nU8qR7S'];
  const hubId = 'WH_MOCK_3';
  const hubName = 'Mumbai Hub';

  // 1. Ensure Mumbai Hub exists
  const hubRef = db.collection('warehouses').doc(hubId);
  await hubRef.set({
    name: hubName,
    code: 'BOM_HUB_01',
    location: 'Navi Mumbai, India',
    isActive: true,
    dockCapacity: 1, // Force conflict for demo
    createdAt: new Date(),
    updatedAt: new Date()
  }, { merge: true });
  console.log(`✅ Ensured ${hubName} exists.`);

  const shipments = [
    {
      id: 'LIFE-PHARMA-001',
      shipmentId: 'LIFE-PHARMA-001',
      type: 'INTERNATIONAL',
      status: 'IN_TRANSIT',
      origin: { type: 'VENDOR', name: 'Lifeline Pharma Hub', vendorId: 'VND_PHARMA_01' },
      destination: { type: 'WAREHOUSE', warehouseId: 'WH_MOCK_3', name: 'Mumbai Hub' },
      cargo: [
        { productId: products[0], quantity: 1000, name: 'Critical Insulin Stock' },
        { productId: products[1], quantity: 50, name: 'Surgical Laser Units' }
      ],
      riskScore: 68,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(Date.now() + 12 * 3600000).toISOString(),
      vendorReliabilityScore: 94
    },
    {
      id: 'INTL-DXB-001',
      shipmentId: 'INTL-DXB-001',
      type: 'INTERNATIONAL',
      status: 'IN_TRANSIT',
      customsStatus: 'DOC_AUDIT_PENDING',
      customsPort: 'Dubai Jebel Ali',
      origin: { type: 'VENDOR', name: 'Al-Barakah MedSupply DXB', vendorId: 'VND_DXB_1' },
      destination: { type: 'WAREHOUSE', warehouseId: hubId, name: hubName },
      cargo: [{ productId: products[0], quantity: 500, name: 'Surgical Gloves XL' }],
      riskScore: 22,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(Date.now() + 48 * 3600000).toISOString(),
      lastCustomsEventAt: new Date().toISOString()
    },
    {
      id: 'INTL-SIN-002',
      shipmentId: 'INTL-SIN-002',
      type: 'INTERNATIONAL',
      status: 'HELD_IN_CUSTOMS',
      customsStatus: 'QUARANTINE_HOLD',
      customsPort: 'Port of Singapore',
      origin: { type: 'VENDOR', name: 'Singapore BioLabs', vendorId: 'VND_SIN_1' },
      destination: { type: 'WAREHOUSE', warehouseId: hubId, name: hubName },
      cargo: [{ productId: products[1], quantity: 200, name: 'Eco-Friendly Masks' }],
      riskScore: 78,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(Date.now() + 120 * 3600000).toISOString(),
      lastCustomsEventAt: new Date().toISOString()
    },
    {
      id: 'CONFLICT-SEA-01',
      shipmentId: 'CONFLICT-SEA-01',
      type: 'INBOUND',
      status: 'DISPATCHED',
      origin: { type: 'VENDOR', name: 'Local Logistics Co', vendorId: 'VND_LOC_1' },
      destination: { type: 'WAREHOUSE', warehouseId: hubId, name: hubName },
      cargo: [{ productId: products[0], quantity: 150, name: 'Inventory A' }],
      riskScore: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    },
    {
      id: 'CONFLICT-SEA-02',
      shipmentId: 'CONFLICT-SEA-02',
      type: 'INBOUND',
      status: 'IN_TRANSIT',
      origin: { type: 'VENDOR', name: 'Regional Dist', vendorId: 'VND_REG_1' },
      destination: { type: 'WAREHOUSE', warehouseId: hubId, name: hubName },
      cargo: [{ productId: products[1], quantity: 300, name: 'Inventory B' }],
      riskScore: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eta: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    }
  ];

  for (const s of shipments) {
    await db.collection('shipments').doc(s.id).set(s);
    console.log(`✅ Seeded shipment: ${s.id}`);
  }

  // 2. Seed Specialized Users
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
     console.log(`✅ Seeded role-specific user: ${u.email}`);
  }

  console.log('\n--- SEEDING COMPLETE ---');
}

seedIntelligence().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
