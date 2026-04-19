'use client';

import { useState, useEffect } from 'react';
import { Network, AlertTriangle, Route as RouteIcon, Package, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ControlTowerMap() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        const res = await fetch('/api/decisions/pending');
        if (res.ok) {
          const data = await res.json();
          setDecisions(data);
        }
      } catch (err: any) {
        console.error("Failed to fetch decisions", err);
      }
      setLoading(false);
    };
    fetchDecisions();
    const interval = setInterval(fetchDecisions, 10000); // Poll more frequently for demo
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (decisionId: string, optionType: string) => {
     setExecuting(true);
     try {
        const res = await fetch(`/api/decisions/${decisionId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionType })
        });
        
        if (res.ok) {
          setDecisions(prev => prev.filter(d => d.id !== decisionId));
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.error}`);
        }
     } catch (err: any) {
       console.error("Approval failed", err);
     }
     setExecuting(false);
  };

  const triggerRiskScan = async () => {
     setExecuting(true);
     try {
       const res = await fetch('/api/internal/risk-scan', { method: 'POST' });
       if (res.ok) {
         const data = await res.json();
         alert(`Risk Scan Complete! Processed ${data.processed} shipments.`);
       }
     } catch (err: any) {
       console.error("Risk scan failed", err);
     }
     setExecuting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Visual Simulated Map area */}
      <div className="relative w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
         {/* Map graphical placeholder grid - Enhanced for premium feel */}
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
         <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         
         <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="p-3 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-xs font-bold text-blue-400 flex items-center shadow-xl">
                <Network className="inline w-4 h-4 mr-2 animate-pulse" /> NETWORK STATUS: ACTIVE
            </div>
            <button 
               onClick={triggerRiskScan}
               disabled={executing}
               className="p-3 bg-blue-600/20 hover:bg-blue-600/40 backdrop-blur-md rounded-lg border border-blue-500/50 text-xs font-bold text-blue-400 flex items-center transition-all disabled:opacity-50"
            >
                <RouteIcon className="inline w-4 h-4 mr-2" /> TRIGGER AI RISK SCAN
            </button>
         </div>

         {/* Simulated Active Dots for demonstration */}
         <motion.div 
            className="absolute top-[40%] left-[30%] w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
         />
         <motion.div 
            className="absolute top-[60%] left-[70%] w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
         />

         {/* The Critical Shipment */}
         <motion.div 
            className="absolute top-1/2 left-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full bg-red-500 shadow-[0_0_20px_#ef4444]"
            animate={{ scale: [1, 1.3, 1], rotate: 360 }}
            transition={{ scale: { repeat: Infinity, duration: 1.5 }, rotate: { duration: 10, repeat: Infinity, ease: "linear" } }}
         />
         <div className="absolute top-[calc(50%+15px)] left-[calc(50%-45px)] text-[10px] font-bold text-red-500 bg-red-500/10 backdrop-blur-sm border border-red-500/30 px-2 py-1 rounded-full uppercase tracking-tighter">
             SHP-CRITICAL (ALERTS ENABLED)
         </div>
      </div>

      {/* Decision Cards Area */}
      {decisions.length > 0 ? (
         <div className="space-y-4">
             <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                 <AlertTriangle className="w-5 h-5 text-amber-500" />
                 Intelligence Mitigation Approvals
             </h3>
             <AnimatePresence>
                 {decisions.map(card => (
                    <motion.div 
                      key={card.id || card._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent backdrop-blur-xl rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/10 rounded-full blur-3xl"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                            <div className="flex-1">
                                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Risk Event Detected</div>
                                <h4 className="font-black text-2xl text-foreground">
                                   Disruption: {card.shipmentId}
                                </h4>
                                <div className="flex items-center gap-4 mt-2">
                                   <span className="text-xs flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold border border-red-500/20">
                                      <AlertTriangle className="w-3 h-3" /> {card.cascadePayload?.triggerRiskScore}% RISK
                                   </span>
                                   <span className="text-xs text-muted-foreground">
                                      Estimated Delay: <strong>{card.cascadePayload?.delayEstimateHours} Hours</strong>
                                   </span>
                                </div>
                            </div>
                            <div className="md:text-right p-4 bg-white/5 rounded-xl border border-white/10 min-w-[200px]">
                               <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 tracking-widest">Revenue at Risk</p>
                               <p className="text-3xl font-black text-foreground">₹{card.cascadePayload?.totalRevenueAtRisk?.toLocaleString('en-IN')}</p>
                               <p className="text-xs text-muted-foreground mt-1 italic">{card.cascadePayload?.ordersAtRisk?.length || 0} customer orders affected</p>
                            </div>
                        </div>

                        <div className="text-xs font-black uppercase text-muted-foreground mb-4 tracking-widest flex items-center gap-2">
                           <div className="h-px bg-white/10 flex-1"></div>
                           AI MITIGATION PROPOSALS
                           <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {card.options?.map((opt: any, idx: number) => (
                               <div key={idx} className={`p-4 rounded-xl border transition-all hover:shadow-2xl flex flex-col justify-between ${idx === 0 ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/30' : 'bg-white/5 border-white/10'}`}>
                                   <div>
                                      <div className="flex justify-between items-center mb-3">
                                          <span className="font-black text-xs flex items-center gap-2">
                                             <div className={`p-1.5 rounded-lg ${idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                {opt.type === 'REROUTE' ? <RouteIcon className="w-4 h-4"/> : <Package className="w-4 h-4"/>}
                                             </div>
                                             {opt.label}
                                          </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground/80 leading-relaxed mb-6">{opt.summary}</p>
                                   </div>
                                   
                                   <div className="flex flex-col gap-4">
                                      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                                          <div>
                                             <div className="text-[10px] text-muted-foreground uppercase font-bold">Time Saved</div>
                                             <div className="text-emerald-400 font-black">-{opt.timeSavedMinutes}m</div>
                                          </div>
                                          <div className="text-right">
                                             <div className="text-[10px] text-muted-foreground uppercase font-bold">Cost</div>
                                             <div className="text-amber-400 font-black">+₹{opt.costPremium}</div>
                                          </div>
                                      </div>
                                      
                                      <button 
                                        disabled={executing}
                                        onClick={() => handleApprove(card.id || card._id, opt.type)}
                                        className={`w-full py-2.5 rounded-lg text-xs font-black transition-all transform active:scale-95 disabled:opacity-50 ${idx === 0 ? 'bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                      >
                                          {executing ? 'EXECUTING...' : 'APPROVE & EXECUTE'}
                                      </button>
                                   </div>
                               </div>
                            ))}
                        </div>
                    </motion.div>
                 ))}
             </AnimatePresence>
         </div>
      ) : (
         <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No active supply chain disruptions detected. Network is currently stable.</p>
            <button 
               onClick={triggerRiskScan}
               className="mt-4 text-xs font-black text-primary hover:underline uppercase tracking-widest"
            >
               Run Continuous Diagnostic
            </button>
         </div>
      )}
    </div>
  );
}
