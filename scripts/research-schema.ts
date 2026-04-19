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

async function research() {
  console.log('--- RESEARCHING SCHEMAS ---');

  const collections = ['receipts', 'warehouses', 'vendors', 'shipments'];
  
  for (const colName of collections) {
    const snap = await db.collection(colName).limit(1).get();
    if (!snap.empty) {
      console.log(`\n[${colName}] sample:`);
      console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
      console.log(`\n[${colName}] is empty.`);
    }
  }
}

research().catch(console.error);
