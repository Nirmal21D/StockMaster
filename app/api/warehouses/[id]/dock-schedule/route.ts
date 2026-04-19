import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { startOfDay, endOfDay, addDays, parseISO, format } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const warehouseId = params.id;
    const warehouseDoc = await adminDb.collection('warehouses').doc(warehouseId).get();
    
    if (!warehouseDoc.exists) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const warehouseData = warehouseDoc.data();
    const capacity = warehouseData?.dockCapacity || 2;

    // Fetch shipments arriving at this warehouse
    const shipmentsSnap = await adminDb.collection('shipments')
      .where('destination.warehouseId', '==', warehouseId)
      .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED', 'HELD_IN_CUSTOMS'])
      .get();

    const shipments = shipmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Define time window: Today and Tomorrow
    const today = startOfDay(new Date());
    const tomorrowEnd = endOfDay(addDays(today, 1));

    // Initialize schedule slots (Hourly)
    const schedule: any = {};
    for (let i = 0; i < 48; i++) {
        const slotTime = new Date(today.getTime() + i * 3600000);
        const slotKey = slotTime.toISOString();
        schedule[slotKey] = {
           time: slotTime.toISOString(),
           displayTime: format(slotTime, 'MMM d, HH:00'),
           shipments: [],
           occupancy: 0,
           atCapacity: false
        };
    }

    // Assign shipments to slots
    shipments.forEach((sh: any) => {
        if (!sh.eta) return;
        const etaDate = parseISO(sh.eta);
        if (etaDate >= today && etaDate <= tomorrowEnd) {
             // Round to nearest hour
             const slotTime = new Date(etaDate);
             slotTime.setMinutes(0, 0, 0);
             const slotKey = slotTime.toISOString();
             
             if (schedule[slotKey]) {
                 schedule[slotKey].shipments.push({
                   id: sh.id,
                   type: sh.type,
                   status: sh.status,
                   riskScore: sh.riskScore
                 });
                 schedule[slotKey].occupancy++;
                 schedule[slotKey].atCapacity = schedule[slotKey].occupancy >= capacity;
             }
        }
    });

    // Convert back to array and filter out empty slots for the UI response, 
    // or keep all for a chart. We'll return sorted slots.
    const sortedSlots = Object.values(schedule).sort((a: any, b: any) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    return NextResponse.json({
        warehouseId,
        warehouseName: warehouseData?.name,
        capacity,
        schedule: sortedSlots
    });
  } catch (error: any) {
    console.error('Dock schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
