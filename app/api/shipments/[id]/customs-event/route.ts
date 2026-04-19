import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { runRiskScan } from '@/lib/services/riskEngine';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shipmentId = params.id;
    const body = await request.json();
    const { event, port, severity, triggerCascade } = body;

    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentDoc = await shipmentRef.get();

    if (!shipmentDoc.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Update shipment with customs data
    const updateData: any = {
      customsStatus: event,
      customsPort: port,
      lastCustomsEventAt: new Date().toISOString(),
      status: 'HELD_IN_CUSTOMS'
    };

    // Severity mapping to risk delta
    const riskDelta = severity === 'HIGH' ? 40 : severity === 'MED' ? 20 : 5;
    
    // We increment the probability or score directly for the demo effect
    updateData.customsHoldProbability = severity === 'HIGH' ? 0.9 : severity === 'MED' ? 0.5 : 0.2;

    await shipmentRef.update(updateData);

    // If requested, trigger the risk engine to re-evaluate and possibly cascade
    if (triggerCascade) {
      await runRiskScan();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Customs event logged: ${event} at ${port}` 
    });
  } catch (error: any) {
    console.error('Customs event error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
