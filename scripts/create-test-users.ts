import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local manually first
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { adminDb, adminAuth } from '../lib/firebase/admin';

async function createTestUsers() {
  console.log('Project ID Check:', process.env.FIREBASE_PROJECT_ID);
  
  const USERS = [
    { email: 'admin@stockmaster.com', password: 'password123', name: 'Admin User', role: 'ADMIN' },
    { email: 'manager@stockmaster.com', password: 'password123', name: 'Manager User', role: 'MANAGER' },
    { email: 'operator@stockmaster.com', password: 'password123', name: 'Operator User', role: 'OPERATOR' }
  ];

  console.log('Starting dummy users creation for Firebase...');

  for (const userConfig of USERS) {
    try {
      console.log(`\nProcessing user ${userConfig.email} with role ${userConfig.role}...`);
      
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(userConfig.email);
        console.log(`- Firebase Auth user already exists (${userRecord.uid}). Updating...`);
        userRecord = await adminAuth.updateUser(userRecord.uid, { 
          password: userConfig.password, 
          displayName: userConfig.name 
        });
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
           userRecord = await adminAuth.createUser({
             email: userConfig.email,
             password: userConfig.password,
             displayName: userConfig.name,
           });
           console.log(`- Created Firebase Auth user (${userRecord.uid}).`);
        } else {
           console.error(`Auth Error:`, authError);
           throw authError; // This is where the configuration identifier error happens
        }
      }

      const docRef = adminDb.collection('users').doc(userRecord.uid);
      const doc = await docRef.get();
      
      const firestoreData: any = {
        name: userConfig.name,
        email: userConfig.email,
        status: 'ACTIVE',
        role: userConfig.role,
        isActive: true,
        updatedAt: new Date()
      };
      
      if (!doc.exists) {
        firestoreData.createdAt = new Date();
        firestoreData.assignedWarehouses = [];
      }

      await docRef.set(firestoreData, { merge: true });

      console.log(`✅ Successfully set up ${userConfig.email} as ${userConfig.role} (Password: ${userConfig.password})`);
    } catch (err: any) {
      console.error(`❌ Failed to process user ${userConfig.email}:`, err);
    }
  }
  
  console.log('\n✅ Done creating all test users!');
  process.exit(0);
}

createTestUsers();