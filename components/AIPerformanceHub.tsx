
import React from 'react';
import { 
  Activity as ActivityIcon, 
  Zap, 
  AlertTriangle, 
  TrendingUp as TrendingIcon 
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Athlete } from '../types';

interface AIPerformanceHubProps {
  athlete: Athlete;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  canAnalyze?: boolean;
}

export const AIPerformanceHub: React.FC<AIPerformanceHubProps> = ({ 
  athlete, 
  isAnalyzing = false, 
  onAnalyze = () => {}, 
  canAnalyze = false 
}) => {
  const radarData = React.useMemo(() => {
    if (!athlete.metrics.physicalCapabilities) return [];
    const caps = athlete.metrics.physicalCapabilities;
    return [
      { subject: 'Aeróbica', A: caps.aerobic, fullMark: 100 },
      { subject: 'Anaeróbica', A: caps.anaerobic, fullMark: 100 },
      { subject: 'Força', A: caps.strength, fullMark: 100 },
      { subject: 'Velocidade', A: caps.speed, fullMark: 100 },
      { subject: 'Flexibilidade', A: caps.flexibility, fullMark: 100 },
      { subject: 'Resistência', A: caps.endurance, fullMark: 100 },
    ];
  }, [athlete]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
          <ActivityIcon className="w-64 h-64" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">AI Performance Hub</span>
              <div className="h-px w-24 bg-slate-800"></div>
            </div>
            {canAnalyze && (
              <button 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black uppercase italic tracking-tighter text-[9px] flex items-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg"
              >
                <Zap className={`w-3 h-3 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? 'Analisando...' : 'Atualizar IA'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Performance</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black italic text-emerald-400">{athlete.metrics.performanceScore || '--'}</span>
                <span className="text-[10px] font-bold text-slate-500 mb-2">/100</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fadiga</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black italic text-amber-400">{athlete.metrics.fatigueScore || '--'}</span>
                <span className="text-[10px] font-bold text-slate-500 mb-2">/100</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prontidão</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black italic text-blue-400">{athlete.metrics.readinessScore || '--'}</span>
                <span className="text-[10px] font-bold text-slate-500 mb-2">/100</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Risco Lesão</p>
              <div className="flex items-end gap-1">
                <span className={`text-4xl font-black italic ${(athlete.metrics.injuryRiskScore || 0) > 60 ? 'text-red-500' : 'text-slate-300'}`}>
                  {athlete.metrics.injuryRiskScore || '--'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 mb-2">/100</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
            <p className="text-sm font-medium italic text-slate-300 leading-relaxed">
              {athlete.metrics.aiAnalysis || "Clique em 'Atualizar IA' para gerar um relatório detalhado baseado nos seus treinos recentes e métricas fisiológicas."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-4">Radar de Capacidades</h3>
        <div className="w-full h-64">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Atleta"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 italic text-[10px] font-black uppercase text-center">
              Aguardando Análise IA
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
