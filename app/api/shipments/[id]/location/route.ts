import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Note: In production this would require Transport Partner JWT auth.
// Mocking simple open POST for hackathon connectivity.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { lat, lng, speed, heading, timestamp, isResting } = await request.json();

    const shipmentRef = adminDb.collection('shipments').doc(params.id);
    const shipmentSnap = await shipmentRef.get();
    
    if (!shipmentSnap.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Write location ping array
    await adminDb.collection('locationPings').add({
      shipmentId: params.id,
      lat,
      lng,
      speed,
      heading,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Update shipment current stats
    await shipmentRef.update({
      currentLat: lat,
      currentLng: lng,
      currentSpeed: speed,
      heading,
      isResting: isResting || false,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
