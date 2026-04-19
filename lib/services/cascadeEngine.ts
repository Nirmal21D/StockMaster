import { adminDb } from '../firebase/admin';
import { generateDecision } from './vertexAiService';
import { logEvent } from './loggerService';

export const runCascadeSimulation = async (shipmentId: string, riskScore: number, delayEstimateHours: number) => {
    const shipmentDoc = await adminDb.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) return null;
    const shipment = shipmentDoc.data();

    // 1. Identify destination
    const destinationWarehouseId = shipment?.destination?.warehouseId;
    if (!destinationWarehouseId) return null;

    const affectedProducts: any[] = [];
    const ordersAtRisk: any[] = [];
    let totalRevenueAtRisk = 0;

    // 2. Compute stock drops
    for (const line of shipment?.cargo || []) {
        const productDoc = await adminDb.collection('products').doc(line.productId).get();
        if (!productDoc.exists) continue;
        const product = productDoc.data();

        // Check current stock levels at destination
        const stockLevelsSnap = await adminDb.collection('stockLevels')
            .where('warehouseId', '==', destinationWarehouseId)
            .where('productId', '==', line.productId)
            .get();

        let currentStock = 0;
        stockLevelsSnap.docs.forEach(doc => currentStock += (doc.data().quantity || 0));

        // Mock projected stock drop for demonstration
        const projectedOnArrival = Math.max(0, currentStock - Math.floor(Math.random() * currentStock));
        const reorderLevel = product?.reorderLevel || 10;

        if (projectedOnArrival < reorderLevel) {
            affectedProducts.push({
                sku: product?.sku,
                name: product?.name,
                productId: line.productId,
                currentStock,
                projectedOnArrival,
                reorderLevel
            });

            // 3. Find pending Deliveries dependent on this product
            const pendingDeliveriesSnap = await adminDb.collection('deliveries')
                .where('warehouseId', '==', destinationWarehouseId)
                .where('status', 'in', ['WAITING', 'DRAFT', 'READY'])
                .get();

            pendingDeliveriesSnap.docs.forEach(d => {
                const delData = d.data();
                const matchedLine = (delData.lines || []).find((dl: any) => dl.productId === line.productId);
                if (matchedLine) {
                    // Calculate mock value based on quantity * base price
                    const lineValue = matchedLine.quantity * (product?.price || 1500); 
                    ordersAtRisk.push({
                        orderId: d.id,
                        customer: `Retailer ${d.id.substring(0, 4)}`,
                        value: lineValue,
                        deadline: new Date(Date.now() + 48 * 3600000).toISOString() // Simulated
                    });
                    totalRevenueAtRisk += lineValue;
                }
            });
        }
    }

    if (ordersAtRisk.length === 0) return null;

    const cascadePayload = {
       shipmentId,
       triggerRiskScore: riskScore,
       delayEstimateHours,
       affectedWarehouse: destinationWarehouseId,
       affectedProducts,
       ordersAtRisk,
       totalRevenueAtRisk,
       cascadeDepth: 1
    };

    // 4. Generate Mitigation Options with Google Vertex AI
    let aiOptions: any[] = [];
    try {
        const prompt = `
            You are an advanced Supply Chain Intelligence Agent. 
            A shipment (${shipmentId}) containing critical goods has hit a bottleneck (Risk Score: ${riskScore}) causing a delay of ${delayEstimateHours} hours.
            This will cascade and cause stockouts for ${affectedProducts.length} unique products, putting ${ordersAtRisk.length} delivery orders at risk, totaling ₹${totalRevenueAtRisk} in revenue.

            Generate 3 ranked mitigation options as valid JSON.
            Structure MUST precisely match:
            [
              {
                "type": "REROUTE" | "REDISTRIBUTE" | "BACKUP_SUPPLIER" | "GIG_TRANSPORT",
                "label": "Brief Action Title",
                "summary": "Human readable explanation of why this fixes the issue and what happens.",
                "timeSavedMinutes": number,
                "costPremium": number,
                "confidenceScore": number (0-100)
              }
            ]
            Return strictly the JSON array. Make the REROUTE option the highest confidence.
        `;

        await logEvent('INFO', `Requesting Vertex AI Decision for Shipment ${shipmentId}`, { riskScore });
        const text = await generateDecision(prompt);
        
        if (text) {
           const jsonMatch = text.match(/\[.*\]/s);
           if (jsonMatch) {
               aiOptions = JSON.parse(jsonMatch[0]);
               await logEvent('INFO', `Vertex AI Decision Generated Successfully`, { shipmentId, optionsCount: aiOptions.length });
           }
        }
    } catch(err) {
        await logEvent('ERROR', `Vertex AI Generation Failed`, { shipmentId, error: err.message });
        console.error("Gemini Failure:", err);
        // Fallback
        aiOptions = [{
           type: 'REROUTE', label: 'Reroute via Highway', summary: 'Emergency fall back reroute computed.',
           timeSavedMinutes: Math.floor(delayEstimateHours*60) / 2, costPremium: 500, confidenceScore: 85
        }];
    }

    // 5. Build Decision Card
    const cardRef = adminDb.collection('decisionCards').doc();
    await cardRef.set({
        businessId: shipment?.businessId || null,
        shipmentId,
        cascadePayload,
        options: aiOptions,
        recommendedOptionIndex: 0,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 3600000).toISOString()
    });

    return cardRef.id;
};
