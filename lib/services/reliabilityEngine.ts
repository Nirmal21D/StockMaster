import { adminDb } from '../firebase/admin';

export const recomputeVendorReliability = async () => {
    const receiptsSnap = await adminDb.collection('receipts')
        .where('status', '==', 'COMPLETED')
        .get();

    const vendorStats: Record<string, { count: number; delayedCount: number; totalQtyVariance: number }> = {};

    receiptsSnap.docs.forEach(doc => {
        const data = doc.data();
        const vendor = data.supplierName || 'Unknown';
        
        if (!vendorStats[vendor]) {
            vendorStats[vendor] = { count: 0, delayedCount: 0, totalQtyVariance: 0 };
        }

        const stats = vendorStats[vendor];
        stats.count++;

        // Logic Mock: Lead time delay check
        // If receivedAt - createdAt > 5 days (assumed threshold)
        const created = data.createdAt?.toDate?.() || new Date(data.createdAt);
        const received = data.receivedAt?.toDate?.() || new Date(data.receivedAt || Date.now());
        const days = (received.getTime() - created.getTime()) / (1000 * 3600 * 24);
        
        if (days > 5) stats.delayedCount++;

        // Logic Mock: Quantity variance (ordered vs received)
        // If receipt doesn't have original order qty, we simulate some variance
        const variance = Math.random() > 0.8 ? 0.1 : 0; // 20% chance of 10% discrepancy
        stats.totalQtyVariance += variance;
    });

    const results = [];

    for (const [vendor, stats] of Object.entries(vendorStats)) {
        // Score = 100 - (delay_rate * 40) - (variance_rate * 60)
        const delayRate = stats.delayedCount / stats.count;
        const varianceRate = stats.totalQtyVariance / stats.count;
        
        let score = Math.round(100 - (delayRate * 40) - (varianceRate * 60));
        score = Math.max(30, Math.min(100, score)); // Min 30 for demo visibility

        // Persist to vendorMetrics
        await adminDb.collection('vendorMetrics').doc(vendor).set({
            vendorName: vendor,
            reliabilityScore: score,
            totalReceipts: stats.count,
            delayRate: Math.round(delayRate * 100),
            updatedAt: new Date().toISOString()
        });

        // Update active shipments from this vendor
        const shipmentsSnap = await adminDb.collection('shipments')
            .where('supplierName', '==', vendor)
            .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED'])
            .get();

        for (const shDoc of shipmentsSnap.docs) {
            await shDoc.ref.update({ vendorReliabilityScore: score });
        }

        results.push({ vendor, score });
    }

    return results;
};
