
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { User, Target, Zap, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { athletes, selectedAthleteId, userRole, getAthleteMetrics, isLoading } = useApp();

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const showIndividual = userRole === 'athlete' || (userRole === 'coach' && selectedAthleteId);

  // Data Calculations
  const metrics = useMemo(() => {
    if (showIndividual && activeAthlete) {
      return getAthleteMetrics(activeAthlete.id);
    }
    return null;
  }, [showIndividual, activeAthlete, getAthleteMetrics]);

  // Coach Global Stats
  const globalStats = {
    activeAthletes: athletes.length,
    avgVDOT: athletes.length > 0 ? Math.round(athletes.reduce((acc, curr) => acc + curr.metrics.vdot, 0) / athletes.length) : 0,
  };

  const intensityData = [
    { name: 'Leve (Z1/Z2)', value: 70, color: '#3b82f6' },
    { name: 'Moderado (Z3)', value: 20, color: '#f59e0b' },
    { name: 'Forte (Z4/Z5)', value: 10, color: '#ef4444' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 gap-2">
         <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
         <p>Sincronizando com a nuvem...</p>
      </div>
    );
  }

  if (showIndividual && !activeAthlete) {
    return (
       <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
         <AlertCircle className="w-12 h-12 mb-2" />
         <p>Selecione um atleta na barra lateral para ver o painel individual.</p>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">
          {showIndividual ? `Painel de ${activeAthlete?.name}` : 'Visão Geral do Treinador'}
        </h1>
        <p className="text-slate-500">
          {showIndividual 
            ? 'Acompanhamento de evolução e conclusão de treinos' 
            : 'Métricas gerais da equipe (Sincronizado na Nuvem)'}
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {showIndividual && metrics ? (
          <>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Conclusão</p>
                <p className="text-3xl font-bold text-slate-800">{metrics.completionRate}%</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Target className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Vol. Planejado</p>
                <p className="text-3xl font-bold text-slate-800">{metrics.totalVolumePlanned} <span className="text-sm text-slate-400 font-normal">km</span></p>
              </div>
              <div className="p-3 bg-gray-50 rounded-full text-gray-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Vol. Executado</p>
                <p className="text-3xl font-bold text-green-600">{metrics.totalVolumeCompleted} <span className="text-sm text-slate-400 font-normal">km</span></p>
              </div>
              <div className="p-3 bg-green-50 rounded-full text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">VDOT Atual</p>
                <p className="text-3xl font-bold text-indigo-600">{activeAthlete?.metrics.vdot}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Atletas Ativos</p>
                <p className="text-3xl font-bold text-slate-800">{globalStats.activeAthletes}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <User className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">VDOT Médio</p>
                <p className="text-3xl font-bold text-slate-800">{globalStats.avgVDOT}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Individual Charts */}
      {showIndividual && metrics && metrics.history.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Planned vs Completed Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Volume Semanal: Planejado vs Realizado</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend />
                  <Bar name="Planejado (km)" dataKey="planned" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar name="Executado (km)" dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Intensity Distribution (Visual Guide) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuição Recomendada</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intensityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {intensityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <span className="text-xl font-bold text-slate-700">80/20</span>
              </div>
            </div>
             <div className="text-center text-xs text-slate-500 mt-2">
                Ideal de distribuição de intensidade para evolução segura.
             </div>
          </div>
        </div>
      )}

      {showIndividual && metrics && metrics.history.length === 0 && (
         <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
            <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-600 font-medium">Sem dados de treino</h3>
            <p className="text-slate-400 text-sm">Gere um plano de periodização para começar a ver os gráficos.</p>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
