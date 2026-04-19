import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { initCron } from '@/lib/services/cronService';

export async function GET(request: NextRequest) {
  try {
    // Initialize background risk bot on first request
    initCron();
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const vendorIdParam = searchParams.get('vendorId');
    
    // Role-based scoping
    const userRole = (session.user as any).role;
    const userVendorId = (session.user as any).vendorId;
    
    let shipmentsRef: any = adminDb.collection('shipments');
    
    if (status) {
      shipmentsRef = shipmentsRef.where('status', '==', status);
    }
    if (type) {
      shipmentsRef = shipmentsRef.where('type', '==', type);
    }

    const snapshot = await shipmentsRef.get();
    
    let shipments = snapshot.docs.map((doc: any) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data()
    }));

    // Post-query filtering for vendorId (Mandatory for VENDOR role)
    if (userRole === 'VENDOR' && userVendorId) {
       shipments = shipments.filter((sh: any) => 
          sh.origin?.vendorId === userVendorId || sh.vendorId === userVendorId
       );
    } else if (vendorIdParam) {
       shipments = shipments.filter((sh: any) => 
          sh.origin?.vendorId === vendorIdParam || sh.vendorId === vendorIdParam
       );
    }

    // Manual sort by createdAt descending
    shipments.sort((a: any, b: any) => {
      const getTime = (val: any) => {
        if (!val) return 0;
        if (val.seconds) return val.seconds * 1000;
        return new Date(val).getTime();
      };
      
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    return NextResponse.json(shipments);
  } catch (error: any) {
    console.error('Shipments GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
