import { adminDb } from '../lib/firebase/admin';

/**
 * SupplyMind Intelligence Test Script
 * Use this to verify your Firestore connectivity and Risk Engine models.
 */
async function testIntelligence() {
  console.log('🚀 Initializing SupplyMind Discovery...');
  
  try {
    const shipments = await adminDb.collection('shipments').limit(5).get();
    console.log(`✅ Connection Stable. Found ${shipments.size} active shipments.`);
    
    shipments.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- Shipment ${doc.id}: Risk Score ${data.riskScore || 0}`);
    });

    const decisions = await adminDb.collection('decisionCards').where('status', '==', 'PENDING').get();
    console.log(`✅ Intelligence Engine: ${decisions.size} pending AI Decision Cards.`);

  } catch (err) {
    console.error('❌ Intelligence Sync Failed:', err);
  }
}

testIntelligence();
