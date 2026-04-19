import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
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

async function seed() {
  console.log('🚀 Seeding demo shipments...');

  const shipmentsCol = db.collection('shipments');
  const productsCol = db.collection('products');
  const warehousesCol = db.collection('warehouses');

  // 1. Get some real products to make it look legitimate
  const productsSnap = await productsCol.limit(5).get();
  const productIds = productsSnap.docs.map(d => d.id);
  
  if (productIds.length === 0) {
    console.error('❌ No products found! Run npm run seed (base seed) first.');
    return;
  }

  // 2. Get some real warehouses
  const whSnap = await warehousesCol.limit(5).get();
  const whIds = whSnap.docs.map(d => d.id);

  const moscowWH = whIds[0] || 'WH_MOCK_1';
  const delhiWH = whIds[1] || 'WH_MOCK_2';
  const mumbaiWH = whIds[2] || 'WH_MOCK_3';

  // 3. Clear existing demo shipments if any (optional)
  // await db.recursiveDelete(shipmentsCol);

  const now = new Date();

  const demoShipments = [
    {
      id: 'SHP-ALPHA-99',
      shipmentId: 'SHP-ALPHA-99',
      type: 'TRANSFER',
      status: 'IN_TRANSIT',
      origin: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
      destination: { type: 'WAREHOUSE', warehouseId: delhiWH, name: 'Delhi NCR Logistics' },
      cargo: [
        { productId: productIds[0], quantity: 50, name: 'Surgical Gloves' },
        { productId: productIds[1], quantity: 20, name: 'Medical Masks' }
      ],
      currentLat: 19.0760,
      currentLng: 72.8777,
      riskScore: 72,
      riskHistory: [
        { score: 45, timestamp: new Date(now.getTime() - 3600000).toISOString() },
        { score: 72, timestamp: now.toISOString() }
      ],
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      eta: new Date(now.getTime() + 8 * 3600000).toISOString()
    },
    {
       id: 'SHP-INTL-DUB-01',
       shipmentId: 'SHP-INTL-DUB-01',
       type: 'INTERNATIONAL',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_MIDDLE_EAST', name: 'Gulf Life Sciences' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [
         { productId: productIds[2], quantity: 250, name: 'Vaccine Coolers' }
       ],
       currentLat: 25.0773, 
       currentLng: 55.1399,
       riskScore: 45,
       customsStatus: 'MANIFEST_RECEIVED',
       customsPort: 'Dubai Jebel Ali',
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 4 * 3600000).toISOString()
    },
    {
       id: 'SHP-INTL-SING-02',
       shipmentId: 'SHP-INTL-SING-02',
       type: 'INTERNATIONAL',
       status: 'HELD_IN_CUSTOMS',
       origin: { type: 'VENDOR', vendorId: 'VND_APAC_CORP', name: 'APAC Med-Link' },
       destination: { type: 'WAREHOUSE', warehouseId: delhiWH, name: 'Delhi NCR Logistics' },
       cargo: [
         { productId: productIds[3], quantity: 15, name: 'ICU Monitor' }
       ],
       currentLat: 1.3521, 
       currentLng: 103.8198,
       riskScore: 85,
       customsStatus: 'PHYSICAL_INSPECTION_HOLD',
       customsPort: 'Port of Singapore',
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 12 * 3600000).toISOString()
    },
    {
       id: 'DOCK-CONFLICT-01',
       shipmentId: 'DOCK-CONFLICT-01',
       type: 'INBOUND',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_LOCAL_SUP', name: 'Local Med-Supplies' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [{ productId: productIds[0], quantity: 100, name: 'Surgical Gloves' }],
       riskScore: 15,
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 2 * 3600000).toISOString() // Conflict with ALPHA if same WH
    },
    {
       id: 'DOCK-CONFLICT-02',
       shipmentId: 'DOCK-CONFLICT-02',
       type: 'INBOUND',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_NORTH_PHARMA', name: 'North India Pharma' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [{ productId: productIds[1], quantity: 50, name: 'Medical Masks' }],
       riskScore: 10,
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 2 * 3600000).toISOString() // Same hour
    },
    {
       id: 'DOCK-CONFLICT-03',
       shipmentId: 'DOCK-CONFLICT-03',
       type: 'INBOUND',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_WEST_PHARMA', name: 'West Coast Pharma' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [{ productId: productIds[2], quantity: 30, name: 'Ventilators' }],
       riskScore: 12,
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 2 * 3600000).toISOString() // Same hour -> 3 arrivals vs 4 capacity
    },
    {
       id: 'DOCK-CONFLICT-04',
       shipmentId: 'DOCK-CONFLICT-04',
       type: 'INBOUND',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_GEN_MED', name: 'General Medical Inc' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [{ productId: productIds[3], quantity: 10, name: 'Defibrillators' }],
       riskScore: 68, // Risk item
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 2 * 3600000).toISOString() // 4th arrival -> AT CAPACITY
    },
    {
       id: 'DOCK-CONFLICT-SURGE',
       shipmentId: 'DOCK-CONFLICT-SURGE',
       type: 'INBOUND',
       status: 'IN_TRANSIT',
       origin: { type: 'VENDOR', vendorId: 'VND_EMERGENCY', name: 'Emergency Supplies Ltd' },
       destination: { type: 'WAREHOUSE', warehouseId: mumbaiWH, name: 'Mumbai Hub' },
       cargo: [{ productId: productIds[0], quantity: 500, name: 'Emergency Kits' }],
       riskScore: 20,
       updatedAt: now.toISOString(),
       createdAt: now.toISOString(),
       eta: new Date(now.getTime() + 2 * 3600000).toISOString() // 5th arrival -> OVER CAPACITY
    }
  ];

  for (const sh of demoShipments) {
    await shipmentsCol.doc(sh.id).set(sh);
    console.log(`✅ Seeded ${sh.id}`);
  }

  console.log('✨ Seeding complete. SupplyMind is now live with active data.');
}

seed().catch(console.error);
