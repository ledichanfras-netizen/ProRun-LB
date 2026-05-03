
import React from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';

const Offline: React.FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-emerald-950 text-white p-6 text-center">
      <div className="w-24 h-24 bg-emerald-900/50 rounded-[2rem] flex items-center justify-center mb-8 border border-emerald-800/50 animate-pulse">
        <WifiOff className="w-12 h-12 text-emerald-400" />
      </div>
      
      <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Você está Offline</h1>
      
      <p className="text-emerald-300/60 max-w-xs mb-10 font-medium leading-relaxed uppercase text-xs tracking-widest">
        Parece que sua conexão caiu. O ProRun LB precisa de internet para sincronizar seus treinos e métricas.
      </p>

      <button
        onClick={handleReload}
        className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase italic tracking-tighter"
      >
        <RefreshCcw className="w-5 h-5" /> Tentar Novamente
      </button>

      <div className="mt-12 pt-12 border-t border-emerald-900/50 w-full max-w-xs">
        <p className="text-[9px] text-emerald-400/30 uppercase font-black tracking-[0.2em]">ProRun LB | Performance Integrada</p>
      </div>
    </div>
  );
};

export default Offline;
