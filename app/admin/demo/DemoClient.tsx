'use client';

import { useState } from 'react';
import { 
  Play, 
  Wind, 
  CloudRain, 
  AlertOctagon, 
  RefreshCcw, 
  ShieldAlert,
  Zap,
  CheckCircle,
  Truck
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const triggerScenario = async (id: string, label: string) => {
    setLoading(id);
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: id })
      });
      if (res.ok) {
        setLastAction(`Success: ${label} Triggered`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-red-500 mb-2">
           <Zap className="w-6 h-6 fill-current" />
           <span className="text-sm font-black uppercase tracking-widest">Director Mode</span>
        </div>
        <h1 className="text-4xl font-black text-foreground uppercase tracking-tight">Pitch Orchestration Panel</h1>
        <p className="text-muted-foreground mt-4">
          Use this panel to instantly trigger supply chain disruptions while recording your 3-minute pitch video. 
          This overrides live API data for deterministic demo behavior.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* SCENARIO 1: STORM */}
         <motion.div 
           whileHover={{ y: -5 }}
           className="bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden"
         >
            <div className="absolute top-0 right-0 p-8 text-muted-foreground/10">
               <CloudRain className="w-24 h-24" />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase">Scenario A: The Perfect Storm</h3>
            <p className="text-sm text-muted-foreground mb-6">
               Overrides Singapore weather to "Thunderstorm" (Severity: 95) and isolates 
               Shipment **INTL-SIN-002**.
            </p>
            <button 
              onClick={() => triggerScenario('STORM_SIN', 'Singapore Storm')}
              disabled={!!loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
            >
               {loading === 'STORM_SIN' ? <RefreshCcw className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
               TRIGGER DISRUPTION
            </button>
         </motion.div>

         {/* SCENARIO 2: BOTTLENECK */}
         <motion.div 
           whileHover={{ y: -5 }}
           className="bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden"
         >
            <div className="absolute top-0 right-0 p-8 text-muted-foreground/10">
               <Truck className="w-24 h-24" />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase">Scenario B: Pharma Bottleneck</h3>
            <p className="text-sm text-muted-foreground mb-6">
               Injects a traffic delay simulation to **LIFE-PHARMA-001**, spiking the Risk Score 
               to 78 and triggering an AI Redistribution card.
            </p>
            <button 
              onClick={() => triggerScenario('PHARMA_JAM', 'Mumbai Bottleneck')}
              disabled={!!loading}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
            >
               {loading === 'PHARMA_JAM' ? <RefreshCcw className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
               INJECT LATENCY
            </button>
         </motion.div>

         {/* RESET */}
         <div className="md:col-span-2 flex items-center justify-between p-6 bg-muted/30 border border-dashed border-border rounded-2xl">
            <div className="flex items-center gap-3">
               <RefreshCcw className="w-5 h-5 text-muted-foreground" />
               <span className="text-sm font-bold text-muted-foreground">Reset telemetry to live state?</span>
            </div>
            <button 
              onClick={() => triggerScenario('RESET', 'Live Sync')}
              disabled={!!loading}
              className="px-8 py-2 bg-background border border-border text-foreground font-bold rounded-lg hover:bg-muted transition-all"
            >
               RESET STATE
            </button>
         </div>
      </div>

      {lastAction && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3"
        >
           <CheckCircle className="w-5 h-5 text-emerald-500" />
           <span className="text-sm font-bold text-emerald-500">{lastAction}</span>
        </motion.div>
      )}

      <footer className="mt-20 border-t border-border pt-8 text-center">
         <div className="flex items-center justify-center gap-2 text-rose-500 font-bold text-xs uppercase mb-2">
            <ShieldAlert className="w-4 h-4" />
            Internal Use Only
         </div>
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-loose">
            SupplyMind v3 Intelligence Layer // Developer Scenario Orchestration v1.0.4
         </p>
      </footer>
    </div>
  );
}
