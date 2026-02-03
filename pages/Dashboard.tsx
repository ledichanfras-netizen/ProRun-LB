
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trophy, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Target,
  User as UserIcon,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const { userRole, athletes, selectedAthleteId, athletePlans, getAthleteMetrics } = useApp();

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const activeAthlete = athletes.find(a => a.id === currentAthleteId);
  
  // getAthleteMetrics já filtra por isVisible === true
  const metrics = currentAthleteId ? getAthleteMetrics(currentAthleteId) : {
    history: [],
    completionRate: 0,
    totalVolumeCompleted: 0,
    totalVolumePlanned: 0
  };

  // Fix: Access .weeks from AthletePlan object and handle potential null/undefined
  const athletePlan = currentAthleteId ? athletePlans[currentAthleteId] : null;
  // FILTRO RIGOROSO: Apenas o que está visível (Publicado)
  const visibleWeeks = athletePlan?.weeks?.filter(w => w.isVisible === true) || [];
  const nextWorkout = visibleWeeks.flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso');

  const allFeedbacks = athletes.flatMap(athlete => {
    // Fix: Access .weeks from AthletePlan and ensure it's an array before filtering
    const aPlan = athletePlans[athlete.id];
    if (!aPlan || !aPlan.weeks) return [];
    
    // Feedbacks também respeitam visibilidade para o treinador ver o histórico real do que o atleta viu
    return aPlan.weeks.filter(w => w.isVisible === true).flatMap(week => (week.workouts || []).filter(w => w.completed && w.feedback).map(w => ({
      athleteName: athlete.name,
      day: w.day,
      type: w.type,
      feedback: w.feedback,
      date: new Date().toLocaleDateString('pt-BR')
    })));
  }).slice(-8).reverse();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Olá, {userRole === 'coach' ? 'Treinador Leandro' : (activeAthlete?.name || 'Atleta')}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {userRole === 'coach' 
              ? 'Status geral do seu elenco de performance.' 
              : 'Seu centro de comando de alta performance.'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adesão (Visible)</p>
            <p className="text-3xl font-black text-slate-800">{metrics.completionRate}%</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executado (KM)</p>
            <p className="text-3xl font-black text-emerald-600">{metrics.totalVolumeCompleted.toFixed(1)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VDOT Atual</p>
            <p className="text-3xl font-black text-slate-800">{activeAthlete?.metrics.vdot || '--'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último 3k</p>
            <p className="text-3xl font-black text-orange-600">{activeAthlete?.metrics.test3kTime || '--'}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter">
                <TrendingUp className="text-emerald-600 w-5 h-5" /> Ciclo de Volume (Publicado)
              </h2>
            </div>
            
            <div className="h-72 w-full">
              {metrics.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="planned" name="Previsto" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Executado" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Calendar className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm font-bold uppercase italic tracking-widest">Nenhuma semana publicada.</p>
                </div>
              )}
            </div>
          </div>

          {userRole === 'coach' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-xl mb-6">
                <MessageSquare className="text-emerald-500 w-6 h-6" /> Feedbacks (Ativos)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {allFeedbacks.length > 0 ? allFeedbacks.map((f, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-black text-slate-900 uppercase">{f.athleteName}</p>
                       <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{f.type}</span>
                    </div>
                    <p className="text-xs text-slate-600 italic">"{f.feedback}"</p>
                  </div>
                )) : <p className="text-slate-400 text-sm italic">Nenhum feedback nas semanas visíveis.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-950 rounded-3xl p-6 text-white shadow-xl group">
            <h3 className="font-black text-lg mb-2 flex items-center gap-2 uppercase italic tracking-tighter">
               <Target className="w-5 h-5 text-emerald-400" /> Próxima Meta
            </h3>
            {nextWorkout ? (
              <div>
                <p className="text-sm text-slate-300 mb-4 line-clamp-2 italic">"{nextWorkout.customDescription}"</p>
                <Link to="/athlete-portal" className="bg-white text-emerald-950 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:scale-105 transition">
                  DETALHES <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sem treinos pendentes nas semanas publicadas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
