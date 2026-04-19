import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario } = await request.json();

    if (scenario === 'STORM_SIN') {
      await adminDb.collection('shipments').doc('INTL-SIN-002').update({
        weatherOverride: 'Thunderstorm',
        riskScore: 92,
        updatedAt: new Date().toISOString()
      });
    } else if (scenario === 'PHARMA_JAM') {
      await adminDb.collection('shipments').doc('LIFE-PHARMA-001').update({
        trafficOverride: 120, // 2 hour delay
        riskScore: 78,
        updatedAt: new Date().toISOString()
      });
    } else if (scenario === 'RESET') {
      const docs = ['INTL-SIN-002', 'LIFE-PHARMA-001'];
      for (const id of docs) {
        await adminDb.collection('shipments').doc(id).update({
          weatherOverride: null,
          trafficOverride: null,
          updatedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
