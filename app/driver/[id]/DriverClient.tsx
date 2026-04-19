'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Navigation, 
  Coffee, 
  CheckCircle2,
  Navigation2,
  Radio
} from 'lucide-react';

interface Shipment {
  id: string;
  origin: any;
  destination: any;
  status: string;
  eta: string;
  riskScore: number;
  currentLat?: number;
  currentLng?: number;
  customsStatus?: string;
}

export default function DriverClient({ shipmentId }: { shipmentId: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchShipment = useCallback(async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`);
      if (res.ok) {
        const data = await res.json();
        setShipment(data);
      }
    } catch (err) {
      console.error('Failed to fetch shipment', err);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchShipment();
    const interval = setInterval(fetchShipment, 30000);
    return () => clearInterval(interval);
  }, [fetchShipment]);

  // GPS Tracking Logic
  useEffect(() => {
    let watchId: number;
    if (isTracking && !isResting) {
      if ('geolocation' in navigator) {
        watchId = window.setInterval(() => {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude, speed, heading } = pos.coords;
            try {
              await fetch(`/api/shipments/${shipmentId}/location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lat: latitude,
                  lng: longitude,
                  speed: speed || 0,
                  heading: heading || 0,
                  timestamp: new Date().toISOString()
                })
              });
              setLastPing(new Date().toLocaleTimeString());
            } catch (err) {
              console.error('Location ping failed', err);
            }
          }, (err) => {
            setError('GPS Permission Denied. Please enable location services.');
            setIsTracking(false);
          });
        }, 15000); // Ping every 15s for the demo intensity
      }
    }
    return () => clearInterval(watchId);
  }, [isTracking, isResting, shipmentId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
      <div className="flex flex-col items-center gap-4">
        <Radio className="w-12 h-12 animate-pulse" />
        <p className="font-black tracking-widest text-xs uppercase">Connecting to Control Tower...</p>
      </div>
    </div>
  );

  if (!shipment) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 p-6 text-center">
      <div>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold uppercase mb-2">Shipment Not Found</h2>
        <p className="text-sm opacity-60">Invalid or expired tracking link. Please contact dispatcher.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Top Banner - DISPATCHER STATUS */}
      <div className={`p-4 border-b border-white/5 flex items-center justify-between ${shipment.riskScore >= 65 ? 'bg-red-500 text-white' : 'bg-blue-600'}`}>
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">Shipment Active</p>
            <p className="font-black text-lg -mt-1">{shipmentId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">Arrival Status</p>
          <p className="font-black text-lg -mt-1">
             {shipment.riskScore >= 65 ? 'DELAY RISK' : 'ON TRACK'}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-lg mx-auto pb-32">
        {/* Destination Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 -z-10 group-hover:scale-110 transition-transform">
             <Navigation className="w-24 h-24 rotate-45" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-emerald-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Origin</p>
                  <p className="font-bold text-slate-200">Mumbai Logistics Hub</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destination</p>
                  <p className="font-bold text-slate-200">Delhi Central Warehouse</p>
               </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase">Next ETA</span>
              </div>
              <p className="text-xl font-black text-blue-400">
                {new Date(shipment.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase">Risk Score</span>
              </div>
              <p className={`text-xl font-black ${shipment.riskScore >= 65 ? 'text-red-500' : 'text-emerald-400'}`}>
                {shipment.riskScore}%
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="space-y-4">
           {/* Telemetry Toggle */}
           <button 
             onClick={() => {
                if (!isTracking) setError(null);
                setIsTracking(!isTracking);
             }}
             className={`w-full py-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-4 ${
               isTracking 
               ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
               : 'bg-white/5 border-white/10 text-white hover:border-blue-500/50'
             }`}
           >
              {isTracking ? <Radio className="w-8 h-8 animate-ping" /> : <Navigation2 className="w-8 h-8" />}
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">Live Telemetry</p>
                <p className="text-xl font-black">{isTracking ? 'TRACKING LIVE' : 'START TRACKING'}</p>
              </div>
           </button>

           {/* HOS Fatigue Toggle */}
           <button 
             onClick={() => setIsResting(!isResting)}
             className={`w-full py-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-4 ${
               isResting 
               ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
               : 'bg-white/5 border-white/10 text-white'
             }`}
           >
              {isResting ? <Coffee className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">HOS Safety</p>
                <p className="text-xl font-black">{isResting ? 'RESTING (OFF-DUTY)' : 'ON-DUTY (DRIVING)'}</p>
              </div>
           </button>
        </div>

        {/* Last Activity */}
        <div className="text-center">
           {lastPing ? (
             <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest flex items-center justify-center gap-2">
               <CheckCircle2 className="w-3 h-3" />
               Last Signal Reached Tower: {lastPing}
             </p>
           ) : (
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
               Signal offline. Telemetry inactive.
             </p>
           )}
           {error && <p className="text-[10px] font-black text-red-500 uppercase mt-2">{error}</p>}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
         <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-95">
            <MapPin className="w-5 h-5" />
            OPEN NAVIGATOR (GOOGLE MAPS)
         </button>
      </div>
    </div>
  );
}
