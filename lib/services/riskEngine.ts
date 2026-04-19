import { adminDb } from '../firebase/admin';
import { runCascadeSimulation } from './cascadeEngine';

// Helper: Fetch Live Traffic Delay from Google Maps
const getTrafficDelayMinutes = async (lat: number, lng: number): Promise<number> => {
   const apiKey = process.env.GOOGLE_MAPS_API_KEY;
   if (!apiKey) {
      // Fallback to simulation if no key
      return Math.random() > 0.7 ? Math.floor(45 + Math.random() * 60) : 0;
   }
   
   try {
      // In a real production environment, we'd use the distance matrix for origin -> destination
      // Here we mock a probe around current location to simulate local congestion
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${lat + 0.1},${lng + 0.1}&departure_time=now&key=${apiKey}`);
      const data = await response.json();
      if (data.status === 'OK') {
         const element = data.rows[0].elements[0];
         const duration = element.duration.value;
         const durationTraffic = element.duration_in_traffic?.value || duration;
         return Math.max(0, Math.floor((durationTraffic - duration) / 60));
      }
   } catch (err: any) {
      console.error('Google Maps API Error:', err);
   }
   return 0;
};

// Helper: Fetch Weather Severity from OpenWeatherMap
const getWeatherSeverity = async (lat: number, lng: number): Promise<number> => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
       return Math.random() > 0.8 ? 85 : 10; // Fallback simulation
    }

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`);
        const data = await response.json();
        const condition = data.weather?.[0]?.main;
        
        // Map common conditions to severity index
        const severityMap: Record<string, number> = {
           'Thunderstorm': 90,
           'Snow': 80,
           'Rain': 50,
           'Drizzle': 30,
           'Clear': 10,
           'Clouds': 20
        };
        return severityMap[condition] || 15;
    } catch (err: any) {
        console.error('Weather API Error:', err);
    }
    return 15;
};

export const runRiskScan = async () => {
   const shipmentsSnap = await adminDb.collection('shipments')
      .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED'])
      .get();
      
   const results = [];
   
   for (const doc of shipmentsSnap.docs) {
       const shipment = doc.data();
       const lat = shipment.currentLat || 0;
       const lng = shipment.currentLng || 0;

       // Gather Facets (with Director Mode overrides)
       const trafficDelayMinutes = shipment.trafficOverride !== undefined && shipment.trafficOverride !== null 
          ? shipment.trafficOverride 
          : await getTrafficDelayMinutes(lat, lng);
          
       const weatherSeverityIndex = shipment.weatherOverride 
          ? (shipment.weatherOverride === 'Thunderstorm' ? 95 : 15) 
          : await getWeatherSeverity(lat, lng);
       const vendorReliabilityScore = shipment.vendorReliabilityScore || 85; 
       const customsHoldProbability = shipment.customsHoldProbability || 0;
        // Recency-based HOS Risk
        const lastPing = shipment.updatedAt ? new Date(shipment.updatedAt) : new Date(0);
        const hoursSincePing = (Date.now() - lastPing.getTime()) / (1000 * 3600);
        
        // HOS Formula: Base risk is low (5%). 
        // If driving (isResting=false) for long stretches (simulation here but using lastPing as proxy), it spikes.
        // If offline (>1hr), it spikes due to "Zero Visibility Risk"
        let driverHOSRiskIndex = 0.05; 
        if (!shipment.isResting && hoursSincePing > 4) driverHOSRiskIndex = 0.45; // High fatigue risk
        if (hoursSincePing > 1) driverHOSRiskIndex = 0.75; // "Blind Spot" risk - no signal

       // Formula directly from PRD
       // (trafficDelayMinutes / expectedDurationMinutes * 100) * 0.35
       // We'll assume a standard 600 min (10hr) reference duration for scale
       const trafficFactor = (trafficDelayMinutes / 600) * 100;
       
       let riskScore = Math.round(
          (trafficFactor) * 0.35 + 
          (weatherSeverityIndex) * 0.20 +
          (100 - vendorReliabilityScore) * 0.25 +
          (customsHoldProbability * 100) * 0.15 +
          (driverHOSRiskIndex * 100) * 0.05
       );

       // Clamp
       riskScore = Math.max(0, Math.min(100, riskScore));

       // Append to history
       const historyItem = { 
          score: riskScore, 
          timestamp: new Date().toISOString(),
          factors: { trafficDelayMinutes, weatherSeverityIndex }
       };
       const newHistory = [...(shipment.riskHistory || []), historyItem].slice(-20); // Keep last 20
       
       await doc.ref.update({
          riskScore,
          riskHistory: newHistory,
          updatedAt: new Date().toISOString()
       });

       results.push({ shipmentId: doc.id, riskScore });
       
       // Alert condition Trigger Cascade
       if (riskScore >= 65) {
          const existingCards = await adminDb.collection('decisionCards')
             .where('shipmentId', '==', doc.id)
             .where('status', '==', 'PENDING')
             .get();
             
          if (existingCards.empty) {
             await runCascadeSimulation(doc.id, riskScore, Math.max(2, Math.floor(trafficDelayMinutes / 60)));
          }
       }
   }
   
   return results;
};
