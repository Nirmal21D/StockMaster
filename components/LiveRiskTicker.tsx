'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowUpRight, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LiveRiskTicker() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchRiskEvents = async () => {
      try {
        const res = await fetch('/api/shipments');
        if (res.ok) {
          const data = await res.json();
          // Map real shipments to the ticker format
          const mapped = data.map((sh: any) => {
             const lastRisk = sh.riskHistory?.length > 1 ? sh.riskHistory[sh.riskHistory.length - 2].score : 0;
             const delta = sh.riskScore - lastRisk;

             return {
                id: sh.id || sh._id,
                route: sh.origin?.warehouseId || 'Origin',
                destination: sh.destination?.warehouseId || 'Dest',
                risk: sh.riskScore || 0,
                delta: delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0',
                time: sh.updatedAt ? new Date(sh.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
                highRisk: (sh.riskScore || 0) >= 65
             };
          });
          setEvents(mapped);
        }
      } catch (err: any) {
        console.error("Ticker fetch failed", err);
      }
    };

    fetchRiskEvents();
    const interval = setInterval(fetchRiskEvents, 15000); // Pulse every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-black/90 backdrop-blur-xl text-white border-b border-white/5 flex items-center overflow-hidden h-12 px-6 text-xs relative shadow-2xl">
      <div className="font-black flex items-center gap-2 mr-10 text-blue-500 shrink-0 tracking-widest border-r border-white/10 pr-6 h-full">
         <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
         SCM INTELLIGENCE TICKER
      </div>
      
      <div className="flex-1 overflow-hidden relative h-full">
         <div className="absolute whitespace-nowrap flex items-center h-full gap-12 animate-marquee">
            {events.length > 0 ? events.map((ev, idx) => (
               <div key={idx} className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors">
                  <span className="font-black text-slate-100">{ev.id}</span>
                  <span className="text-slate-500 font-medium">{ev.route} <ArrowRight className="w-3 h-3 inline mx-1 opacity-50" /> {ev.destination}</span>
                  <div className={`flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                      ev.highRisk ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                      {ev.highRisk ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                      {ev.risk}% RISK
                  </div>
                  <span className={`text-[10px] font-bold ${ev.delta.startsWith('+') ? 'text-red-400' : ev.delta === '0' ? 'text-slate-500' : 'text-emerald-400'}`}>
                     {ev.delta !== '0' && (ev.delta.startsWith('+') ? <ArrowUpRight className="w-3 h-3 inline mr-0.5" /> : <ArrowRight className="w-3 h-3 inline mr-0.5 rotate-45" />)}
                     {ev.delta !== '0' ? ev.delta : 'STABLE'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">{ev.time}</span>
               </div>
            )) : (
               <div className="text-slate-500 italic tracking-wider">ESTABLISHING SECURE CONNECTION TO LOGISTICS NETWORK...</div>
            )}
         </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(20%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}

