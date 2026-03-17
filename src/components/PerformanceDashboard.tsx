
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { ShieldAlert, Zap, Activity, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { Athlete } from '../../types';

interface PerformanceDashboardProps {
  athlete: Athlete;
  onRunAnalysis?: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ athlete, onRunAnalysis }) => {
  const performance = athlete.performance || {
    readiness: 0,
    injuryRisk: 'Baixo',
    performanceScore: 0,
    acuteLoad: 0,
    chronicLoad: 0,
    ratio: 0
  };

  const capacities = athlete.capacities || {
    aerobic: 0,
    anaerobic: 0,
    strength: 0,
    speed: 0,
    endurance: 0,
    flexibility: 0
  };

  const radarData = [
    { subject: 'Aeróbico', A: capacities.aerobic, fullMark: 100 },
    { subject: 'Anaeróbico', A: capacities.anaerobic, fullMark: 100 },
    { subject: 'Força', A: capacities.strength, fullMark: 100 },
    { subject: 'Velocidade', A: capacities.speed, fullMark: 100 },
    { subject: 'Resistência', A: capacities.endurance, fullMark: 100 },
    { subject: 'Flexibilidade', A: capacities.flexibility, fullMark: 100 },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Baixo': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Moderado': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Alto': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with AI Trigger */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Análise de Performance IA</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Métricas de nível profissional</p>
        </div>
        {onRunAnalysis && (
          <button 
            onClick={onRunAnalysis}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Brain className="w-4 h-4" /> Atualizar Análise
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Zap className="w-12 h-12 text-emerald-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prontidão</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 italic">{performance.readiness}%</span>
            <div className="h-2 w-24 bg-slate-100 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${performance.readiness}%` }} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-tight">Recuperação ideal para treino</p>
        </div>

        {/* Injury Risk Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-12 h-12 text-red-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risco de Lesão</p>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black uppercase italic ${getRiskColor(performance.injuryRisk)}`}>
            <AlertTriangle className="w-3 h-3" /> {performance.injuryRisk}
          </div>
          <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tight">Baseado na carga aguda/crônica</p>
        </div>

        {/* Performance Score Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score de Performance</p>
          <div className="text-4xl font-black text-slate-900 italic">{performance.performanceScore}</div>
          <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-tight">Evolução técnica e física</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Radar de Capacidades</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil físico do atleta</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Atleta"
                  dataKey="A"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Load Analysis */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Análise de Carga (ACWR)</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relação Aguda vs Crônica</p>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio Atual</p>
                <p className="text-3xl font-black text-slate-900 italic">{performance.ratio.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                <p className={`text-xs font-black uppercase italic ${performance.ratio >= 0.8 && performance.ratio <= 1.3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {performance.ratio >= 0.8 && performance.ratio <= 1.3 ? 'Zona de Segurança' : 'Atenção à Carga'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Carga Aguda (7d)</span>
                <span className="text-slate-900">{performance.acuteLoad} TSS</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (performance.acuteLoad / 1000) * 100)}%` }} />
              </div>
              
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pt-2">
                <span className="text-slate-400">Carga Crônica (28d)</span>
                <span className="text-slate-900">{performance.chronicLoad} TSS</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (performance.chronicLoad / 1000) * 100)}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex gap-3">
                <Activity className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                  O ratio ACWR ideal deve estar entre 0.8 e 1.3. Valores acima de 1.5 aumentam significativamente o risco de lesão por excesso de carga.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
