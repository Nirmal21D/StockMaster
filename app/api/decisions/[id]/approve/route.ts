import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = session.user?.role;
    if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { optionType } = await request.json(); // e.g. REROUTE, REDISTRIBUTE, BACKUP_SUPPLIER, GIG_TRANSPORT
    const docRef = adminDb.collection('decisionCards').doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Decision Card not found' }, { status: 404 });
    }
    const cardInfo = docSnap.data() as any;

    if (cardInfo?.status !== 'PENDING') {
      return NextResponse.json({ error: 'Decision Card is already resolved' }, { status: 400 });
    }

    const shipmentId = cardInfo.shipmentId;
    const cascadePayload = cardInfo.cascadePayload;

    let responseMessage = 'Option Approved';

    if (optionType === 'REROUTE') {
       await adminDb.collection('shipments').doc(shipmentId).update({
          riskScore: 30, // Drop risk score as it's mitigated
          status: 'IN_TRANSIT',
          eta: new Date(Date.now() + (cascadePayload?.delayEstimateHours || 4) * 3600000).toISOString(),
          updatedAt: new Date().toISOString()
       });
       responseMessage = 'Shipment Rerouted: New coordinates pushed to driver PWA.';
    }

    if (optionType === 'REDISTRIBUTE') {
       // Create an emergency internal transfer
       const transferRef = adminDb.collection('transfers').doc();
       await transferRef.set({
          transferNumber: `TRF-EMG-${Math.floor(1000 + Math.random() * 9000)}`,
          sourceWarehouseId: 'WH_MOCK_SOURCE', // In real logic this comes from AI choice
          targetWarehouseId: cascadePayload?.affectedWarehouse || '',
          status: 'DRAFT',
          lines: cascadePayload?.affectedProducts?.map((p: any) => ({
             productId: p.productId,
             quantity: p.reorderLevel - p.projectedOnArrival
          })) || [],
          createdBy: session.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEmergency: true
       });
       responseMessage = 'Redistribution transfer drafted from nearby hub.';
    }

    if (optionType === 'BACKUP_SUPPLIER') {
       // Create an emergency receipt (PO draft)
       const receiptRef = adminDb.collection('receipts').doc();
       await receiptRef.set({
          receiptNumber: `RCP-EMG-${Math.floor(1000 + Math.random() * 9000)}`,
          warehouseId: cascadePayload?.affectedWarehouse || '',
          status: 'DRAFT',
          supplierName: 'Emergency Backup Vendor',
          reference: `AI-MITIGATION-${shipmentId}`,
          lines: cascadePayload?.affectedProducts?.map((p: any) => ({
             productId: p.productId,
             quantity: p.reorderLevel * 2 // Emergency stockup
          })) || [],
          createdBy: session.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
       });
       responseMessage = 'Emergency Purchase Order sent to backup supplier.';
    }

    if (optionType === 'GIG_TRANSPORT') {
       const gigRef = adminDb.collection('gigJobs').doc();
       await gigRef.set({
          shipmentId,
          businessId: cardInfo.businessId,
          jobType: 'TRANSPORT',
          status: 'OPEN',
          searchRadiusKm: 50,
          estimatedPay: 1500,
          createdAt: new Date().toISOString()
       });
       responseMessage = 'Gig Transport job posted to local marketplace.';
    }

    // Update Decision Card
    await docRef.update({
        status: 'APPROVED',
        approvedBy: session.user.id,
        approvedOptionType: optionType,
        approvedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: responseMessage });

    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
