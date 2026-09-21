
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
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
  CheckCircle,
  Zap,
  AlertTriangle,
  Info,
  TrendingDown,
  Activity as ActivityIcon,
  TrendingUp as TrendingIcon,
  Battery,
  BatteryCharging,
  Droplets,
  Heart,
  ShieldCheck,
  Flame,
  Moon,
  Brain,
  Smile,
  Sparkles,
  Sliders,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AIPerformanceHub } from '../components/AIPerformanceHub';
import { getAppNow } from '../utils/time';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  LabelList,
  AreaChart,
  Area,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';
import { calculateATL_CTL_TSB } from '../utils/stressModel';

export default function Dashboard() {
  const { userRole, athletes, selectedAthleteId, setSelectedAthleteId, athletePlans, getAthleteMetrics, runAIAnalysis } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeEvolutionChartTab, setActiveEvolutionChartTab] = useState<'stress' | 'readiness'>('stress');
  const [showAdditionalMetricsInfo, setShowAdditionalMetricsInfo] = useState(false);

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const activeAthlete = useMemo(() => athletes.find(a => a.id === currentAthleteId), [athletes, currentAthleteId]);
  
  const handleAIAnalysis = async () => {
    if (!currentAthleteId) return;
    setIsAnalyzing(true);
    try {
      await runAIAnalysis(currentAthleteId);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const metrics = useMemo(() => currentAthleteId ? getAthleteMetrics(currentAthleteId) : {
    history: [],
    completionRate: 0,
    totalVolumeCompleted: 0,
    totalVolumePlanned: 0
  }, [currentAthleteId, getAthleteMetrics]);

  const athletePlan = useMemo(() => currentAthleteId ? athletePlans[currentAthleteId] : null, [currentAthleteId, athletePlans]);
  
  const visibleWeeks = useMemo(() => athletePlan?.weeks?.filter(w => w.isVisible === true) || [], [athletePlan]);
  
  const nextWorkout = useMemo(() => visibleWeeks.flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso'), [visibleWeeks]);

  const allActivities = useMemo(() => {
    const filteredAthletes = selectedAthleteId 
      ? athletes.filter(a => a.id === selectedAthleteId)
      : athletes;

    return filteredAthletes.flatMap(athlete => {
      const aPlan = athletePlans[athlete.id];
      if (!aPlan || !aPlan.weeks) return [];
      
      return aPlan.weeks.flatMap(week => (week.workouts || []).filter(w => w.completed).map(w => ({
        athleteId: athlete.id,
        athleteName: athlete.name,
        day: w.day,
        type: w.type,
        feedback: w.feedback,
        rpe: w.rpe || 0,
        timestamp: getAppNow()
      })));
    });
  }, [athletes, athletePlans, selectedAthleteId]);

  const loadGuidance = useMemo(() => {
    if (!currentAthleteId) return null;
    
    const athleteHistory = allActivities
      .filter(a => a.athleteId === currentAthleteId)
      .slice(-5);

    if (athleteHistory.length < 3) return { 
      status: 'Aguardando Dados', 
      color: 'text-slate-400', 
      bg: 'bg-slate-50',
      icon: <ActivityIcon className="w-8 h-8" />,
      recommendation: 'Registre ao menos 3 sessões com PSE para análise de carga.' 
    };
    
    const avgRPE = athleteHistory.reduce((acc, curr) => acc + curr.rpe, 0) / athleteHistory.length;
    
    if (avgRPE > 8.0) return { 
      status: 'REDUZIR CARGA (OVERREACHING)', 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      icon: <AlertTriangle className="w-8 h-8" />,
      recommendation: 'O atleta está em zona de fadiga acumulada. Reduza volume ou intensidade na próxima semana para evitar lesões.' 
    };
    
    if (avgRPE >= 5.0 && avgRPE <= 8.0) return { 
      status: 'ESTABILIZAR / PERFORMAR', 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      icon: <TrendingIcon className="w-8 h-8" />,
      recommendation: 'Carga ideal para desenvolvimento. O corpo está respondendo bem ao estímulo planejado.' 
    };
    
    return { 
      status: 'AUMENTAR CARGA (SUB-ESTÍMULO)', 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      icon: <ActivityIcon className="w-8 h-8" />,
      recommendation: 'Percepção de esforço muito baixa. Considere progredir os volumes ou reduzir os paces alvo.' 
    };
  }, [currentAthleteId, allActivities]);

  const teamMetrics = useMemo(() => {
    if (userRole !== 'coach') return null;
    
    const totalAthletes = athletes.length;
    const activeAthletes = athletes.filter(a => {
      const plan = athletePlans[a.id];
      const lastWorkout = plan?.weeks?.flatMap(w => w.workouts).filter(w => w.completed).pop();
      return !!lastWorkout;
    }).length;

    const averageCompletion = athletes.length > 0 
      ? athletes.reduce((acc, a) => acc + getAthleteMetrics(a.id).completionRate, 0) / athletes.length
      : 0;

    const riskAthletes = athletes.filter(a => getAthleteMetrics(a.id).completionRate < 50).length;

    return { totalAthletes, activeAthletes, averageCompletion, riskAthletes };
  }, [athletes, athletePlans, getAthleteMetrics, userRole]);

  const stressTimeline = useMemo(() => {
    if (!activeAthlete || !athletePlan || !athletePlan.weeks) return [];
    const vdot = activeAthlete.metrics.vdot || 45;
    return calculateATL_CTL_TSB(athletePlan.weeks, vdot, athletePlan.startDate);
  }, [activeAthlete, athletePlan]);

  const currentStress = useMemo(() => {
    if (stressTimeline.length === 0) return { ctl: 0, atl: 0, tsb: 0 };
    
    // Se tiver data de início, vamos achar o dia de "hoje" na timeline
    if (athletePlan?.startDate) {
      const start = new Date(athletePlan.startDate);
      const today = new Date();
      
      // Diferença em dias
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < stressTimeline.length) {
        return stressTimeline[diffDays];
      }
    }
    
    // Fallback: usar o último dia que tem algum treino concluído
    const lastCompletedIdx = [...stressTimeline].reverse().findIndex(d => d.trimp > 0);
    if (lastCompletedIdx !== -1) {
      const realIdx = stressTimeline.length - 1 - lastCompletedIdx;
      return stressTimeline[realIdx];
    }
    
    // Se nenhum estiver concluído, usar o primeiro dia ou 0
    return stressTimeline[0] || { ctl: 0, atl: 0, tsb: 0 };
  }, [stressTimeline, athletePlan]);

  const getTsbZoneInfo = (tsb: number) => {
    if (tsb > 10) {
      return {
        name: 'Recuperado e Pronto (Frescor Alto)',
        desc: 'Seu corpo está bem descansado e pronto para render o máximo de desempenho. Excelente estado para o dia de uma prova ou teste.',
        actionPlan: 'Momento ideal para dar o seu máximo em provas ou treinos de ritmo forte! Se você não tem competição agendada nos próximos dias, evite ficar muito tempo sem estímulo intenso para não perder o condicionamento adquirido.',
        color: 'text-blue-600 border-blue-500/20 bg-blue-50/60',
        badge: 'bg-blue-100 text-blue-800'
      };
    }
    if (tsb >= -10 && tsb <= 10) {
      return {
        name: 'Equilibrado (Transição e Ajustes)',
        desc: 'Equilíbrio ideal entre cansaço acumulado e recuperação. Seu corpo está estável fisiologicamente.',
        actionPlan: 'Continue seguindo a planilha planejada! Esse estado é ideal para treinos de ritmo moderado e consistência de rodagem. Mantenha os bons hábitos de sono e alimentação para consolidar essa base.',
        color: 'text-emerald-700 border-emerald-500/20 bg-emerald-50/60',
        badge: 'bg-emerald-100 text-emerald-800'
      };
    }
    if (tsb >= -30 && tsb < -10) {
      return {
        name: 'Zona de Evolução (Carga Ótima de Treino)',
        desc: 'Você está no ponto ideal de estresse físico positivo. Há cansaço, mas é ele que estimula seu corpo a se adaptar e evoluir.',
        actionPlan: 'Aqui é onde você mais ganha desempenho! Siga a planilha com foco total na consistência. Capriche na hidratação, alimentação pós-treino e garanta de 7h a 8h de sono de qualidade para recuperar bem.',
        color: 'text-amber-700 border-amber-500/20 bg-amber-50/60',
        badge: 'bg-amber-100 text-amber-800'
      };
    }
    return {
      name: 'Fadiga Muito Alta (Cuidado / Risco Elevado)',
      desc: 'O cansaço acumulado está em níveis excessivos e sua energia está muito baixa. Risco aumentado de lesões ou esgotamento físico.',
      actionPlan: 'ALERTA DE SEGURANÇA! Reduza o volume e intensidade imediatamente. Se o próximo treino for intenso, sugira ao treinador fazer uma corrida regenerativa muito leve ou tirar um dia de descanso total. Priorize o repouso hoje.',
      color: 'text-red-700 border-red-500/20 bg-red-50/60',
      badge: 'bg-red-100 text-red-800'
    };
  };

  const readinessConfrontation = useMemo(() => {
    if (!activeAthlete || !currentStress) return null;
    
    const sub = activeAthlete.readiness || 'ready';
    const objTsb = currentStress.tsb;
    
    let title = '';
    let status = 'neutral'; // 'success' | 'warning' | 'alert'
    let analysis = '';
    let recommendation = '';
    
    if (sub === 'fatigued') {
      if (objTsb < -10) {
        title = 'Coerência Fisiológica: Sobrecarga Esperada';
        status = 'success';
        analysis = 'O atleta se percebe cansado (😴) e a carga matemática confirma cansaço acumulado de treinos. O plano está gerando o estresse planejado de adaptação.';
        recommendation = 'Excelente autopercepção de esforço do atleta. Mantenha os treinos planejados, mas foque em estratégias extras de liberação miofascial, sono longo e hidratação rica.';
      } else {
        title = 'Alerta de Recuperação Inadequada (Fatores Externos)';
        status = 'warning';
        analysis = 'O modelo indica que o corpo teoricamente deveria estar fresco/recuperado, mas o atleta reporta cansaço físico considerável (😴).';
        recommendation = 'Investigue sono prejudicado, estresse do dia a dia, rotina pesada de trabalho ou alimentação inadequada. Se persistir, reduza a intensidade das rodagens hoje.';
      }
    } else if (sub === 'recovering') {
      if (objTsb >= -30 && objTsb < -10) {
        title = 'Recuperação Ativa em Curso';
        status = 'success';
        analysis = 'O atleta se percebe em processo de recuperação (🧘) durante um bloco ativo de treinos pesados. Alinhamento perfeito.';
        recommendation = 'Evite treinos de qualidade máxima hoje. Priorize rodagens regenerativas leves na Zona 1 ou 2 de ritmos.';
      } else if (objTsb >= -10) {
        title = 'Fase de Recuperação Concluída';
        status = 'neutral';
        analysis = 'O atleta está focado em se recuperar e o modelo matemático já aponta prontidão física e frescor muscular.';
        recommendation = 'O atleta está em perfeitas condições para retornar gradualmente aos treinos de volume ou intensidade moderada.';
      } else {
        title = 'Alerta: Cuidado, Necessidade de Repouso';
        status = 'alert';
        analysis = 'A carga de treinos acumulada é muito alta (corpo sobrecarregado) e o atleta já identificou a necessidade crítica de focar em se recuperar (🧘).';
        recommendation = 'Evite tiros rápidos ou treinos de limiar. Dê preferência a um dia de descanso total (off) ou corrida super leve e curta.';
      }
    } else { // sub === 'ready'
      if (objTsb < -30) {
        title = 'Atenção: Risco Oculto de Lesão (Overconfidence)';
        status = 'alert';
        analysis = 'O atleta se sente excelente e pronto para voar (⚡), mas o modelo matemático indica cansaço extremo acumulado nos últimos 7 dias.';
        recommendation = 'Risco clássico de estiramento ou lesão por excesso de confiança das pernas. O treinador deve segurar o ímpeto e não permitir extrapolar as distâncias ou velocidades previstas.';
      } else if (objTsb >= -30 && objTsb < -10) {
        title = 'Aproveitamento Ótimo (Consistência de Rendimento)';
        status = 'success';
        analysis = 'O atleta está em bloco de desenvolvimento físico produtivo e se sente forte, confiante e totalmente pronto (⚡).';
        recommendation = 'Excelente momento de evolução! Siga a planilha de perto. Estimule o atleta a caprichar no treino chave de qualidade da semana.';
      } else {
        title = 'Prontidão Total Confirmada (Zona Verde)';
        status = 'success';
        analysis = 'O corpo está totalmente zerado de cansaço acumulado e o atleta se sente pronto e enérgico (⚡) para dar o máximo.';
        recommendation = 'Momento perfeito para aplicar testes de esforço/VO2máx, treinos chave de tiro de alta intensidade ou simulação de prova!';
      }
    }
    
    return { title, status, analysis, recommendation, subjective: sub };
  }, [activeAthlete, currentStress]);

  // Cálculo da Relação Carga Aguda:Crônica (ACWR - Tim Gabbett)
  const acwrData = useMemo(() => {
    if (!currentStress) {
      return { 
        value: 1.0, 
        formatted: '1.00', 
        status: 'optimal', 
        label: 'Zona Doce (Sweet Spot)', 
        badgeColor: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20', 
        desc: 'Equilíbrio ótimo entre cansaço recente e adaptação crônica. Risco mínimo de lesão.' 
      };
    }
    const ctl = currentStress.ctl || 0;
    const atl = currentStress.atl || 0;
    const value = ctl > 0 ? (atl / ctl) : (atl > 0 ? 1.4 : 1.0);
    const formatted = value.toFixed(2);
    
    if (value < 0.8) {
      return {
        value,
        formatted,
        status: 'under',
        label: 'Sub-treinamento (< 0.80)',
        badgeColor: 'text-blue-700 bg-blue-500/10 border-blue-500/20',
        desc: 'Carga recente menor que o histórico. Risco baixo de lesão, mas destreinamento gradual.'
      };
    }
    if (value <= 1.3) {
      return {
        value,
        formatted,
        status: 'optimal',
        label: 'Zona Doce / Sweet Spot (0.80 - 1.30)',
        badgeColor: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
        desc: 'Zona ideal de evolução! Máxima resposta adaptativa com risco mínimo de lesão.'
      };
    }
    if (value <= 1.5) {
      return {
        value,
        formatted,
        status: 'warning',
        label: 'Zona de Atenção (1.31 - 1.50)',
        badgeColor: 'text-amber-700 bg-amber-500/10 border-amber-500/20',
        desc: 'Aumento rápido de carga aguda (Ramp Rate alto). Monitore dores e qualidade de sono.'
      };
    }
    return {
      value,
      formatted,
      status: 'danger',
      label: 'Zona de Risco de Lesão (> 1.50)',
      badgeColor: 'text-rose-700 bg-rose-500/10 border-rose-500/20',
      desc: 'Pico agudo de carga (Spike > 1.5). Risco elevado de sobrecarga articular ou estiramento.'
    };
  }, [currentStress]);

  // Cálculo Integrado de Bateria Corporal e Nível de Energia (0 a 100%)
  const energyLevelData = useMemo(() => {
    if (!activeAthlete) {
      return { 
        score: 75, 
        label: 'Energia Equilibrada', 
        status: 'good', 
        gradient: 'from-emerald-500 to-teal-400', 
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50 border-emerald-200',
        desc: 'Nível de vitalidade consistente para o treino.' 
      };
    }
    
    // TSB normalizado entre 15% e 100%
    const tsb = currentStress?.tsb ?? 0;
    const tsbPct = Math.min(100, Math.max(15, Math.round(((tsb + 35) / 55) * 100)));
    
    let score = tsbPct;
    const lastR = activeAthlete.lastReadiness;
    
    if (lastR && lastR.readinessScore !== undefined) {
      // 65% Prontidão Diária Relatada (sono, dor, estresse, humor) + 35% Frescor Fisiológico Matemático (TSB)
      score = Math.round((lastR.readinessScore * 0.65) + (tsbPct * 0.35));
    }
    
    score = Math.min(100, Math.max(5, score));
    
    if (score >= 85) {
      return {
        score,
        label: '⚡ Pico de Energia & Prontidão Total',
        status: 'peak',
        gradient: 'from-emerald-500 via-teal-400 to-cyan-400',
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50/80 border-emerald-300',
        desc: lastR?.sleepHours 
          ? `Sono reparador (${lastR.sleepHours}h) e pernas descansadas. Corpo no auge da responsividade para render o máximo.`
          : 'Excelente frescor físico e neuromuscular. Organismo pronto para estímulos fortes.'
      };
    }
    if (score >= 65) {
      return {
        score,
        label: '🟢 Energia Elevada & Boa Disposição',
        status: 'high',
        gradient: 'from-teal-500 to-emerald-400',
        textColor: 'text-teal-700',
        bgColor: 'bg-teal-50/80 border-teal-300',
        desc: 'Bateria corporal saudável para cumprir a sessão prevista com ritmo consistente e boa técnica.'
      };
    }
    if (score >= 45) {
      return {
        score,
        label: '🟡 Energia Moderada (Em Adaptação / Recuperação)',
        status: 'moderate',
        gradient: 'from-amber-500 to-yellow-400',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50/80 border-amber-300',
        desc: 'Cansaço acumulado normal de ciclo de treinamento. Mantenha os ritmos previstos sem forçar além da planilha.'
      };
    }
    return {
      score,
      label: '🔴 Bateria Baixa / Fadiga Acumulada',
      status: 'low',
      gradient: 'from-rose-500 to-red-400',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50/80 border-rose-300',
      desc: 'Bateria corporal drenada. Priorize sono, hidratação profunda e considere treino regenerativo ou descanso ativo.'
    };
  }, [activeAthlete, currentStress]);

  // Histórico de Prontidão Diária para Gráficos
  const readinessHistoryTimeline = useMemo(() => {
    if (!activeAthlete?.readinessHistory || activeAthlete.readinessHistory.length === 0) return [];
    return [...activeAthlete.readinessHistory]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map(entry => ({
        dateStr: entry.date.split('-').slice(1).reverse().join('/'),
        fullDate: entry.date,
        readinessScore: entry.readinessScore,
        energyLevel: entry.energyLevel || entry.readinessScore,
        sleepHours: entry.sleepHours || 7.5,
        sleepQuality: entry.sleepScore,
        stress: entry.stressScore,
        soreness: entry.sorenessScore,
        mood: entry.moodScore,
      }));
  }, [activeAthlete]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3 drop-shadow-sm">
            Olá, <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-2xl border border-emerald-400/20">{userRole === 'coach' ? 'Coach Leandro' : (activeAthlete?.name.split(' ')[0] || 'Atleta')}</span>! 👋
            {userRole === 'coach' && activeAthlete?.readiness && (
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-xl shadow-sm" title={`Prontidão: ${activeAthlete.readiness}`}>
                {activeAthlete.readiness === 'fatigued' ? '😴' : activeAthlete.readiness === 'recovering' ? '🧘' : '⚡'}
              </span>
            )}
          </h1>
          <p className="text-slate-300 mt-2 font-medium italic text-sm md:text-base opacity-90">
            {userRole === 'coach' 
              ? (selectedAthleteId ? `Monitorando performance de: ${activeAthlete?.name}` : 'Visão geral do seu elenco estratégico.') 
              : 'Seu centro de performance técnica em tempo real.'}
          </p>
        </div>
        <div className="flex gap-3">
          {userRole === 'coach' && selectedAthleteId && (
            <button 
              onClick={() => setSelectedAthleteId(null)}
              className="bg-white border-2 border-slate-100 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter text-xs transition-all shadow-sm"
            >
              Visão do Time
            </button>
          )}
          {userRole === 'coach' && currentAthleteId && (
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:scale-105"
            >
              <Zap className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''} text-white`} />
              {isAnalyzing ? 'Analisando...' : 'Análise IA'}
            </button>
          )}
        </div>
      </header>

      {/* Métricas de Elenco (Apenas Coach sem atleta selecionado) */}
      {userRole === 'coach' && !selectedAthleteId && teamMetrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/athletes" className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Atletas</p>
                <p className="text-3xl font-black text-slate-800">{teamMetrics.totalAthletes}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl text-slate-600">
                <UserIcon className="w-6 h-6" />
              </div>
            </Link>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adesão Média</p>
                <p className="text-3xl font-black text-emerald-600">{teamMetrics.averageCompletion.toFixed(0)}%</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <Link to="/athletes?filter=risk" state={{ filter: 'risk' }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100 hover:border-red-200 flex items-center justify-between hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Risco</p>
                <p className="text-3xl font-black text-red-600">{teamMetrics.riskAthletes}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-2xl text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </Link>

            <div className="bg-emerald-950 p-6 rounded-[2rem] shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status ProRun</p>
                <p className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">Elenco Ativo</p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-2xl text-emerald-950">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* NOVO: Status de Prontidão do Elenco */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter mb-6 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-emerald-500" /> Prontidão do Elenco Hoje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {athletes.slice(0, 6).map(athlete => (
                <div key={athlete.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm border-2 ${
                    athlete.readiness === 'fatigued' ? 'bg-red-50 border-red-200 shadow-red-100' :
                    athlete.readiness === 'recovering' ? 'bg-blue-50 border-blue-200 shadow-blue-100' :
                    'bg-emerald-50 border-emerald-200 shadow-emerald-100'
                  }`}>
                    {athlete.readiness === 'fatigued' ? '😴' : athlete.readiness === 'recovering' ? '🧘' : '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase italic truncate">{athlete.name}</p>
                    <p className={`text-[9px] font-bold uppercase ${
                      athlete.readiness === 'fatigued' ? 'text-red-500' :
                      athlete.readiness === 'recovering' ? 'text-blue-500' :
                      'text-emerald-600'
                    }`}>
                      {athlete.readiness === 'fatigued' ? 'Fadigado' :
                       athlete.readiness === 'recovering' ? 'Em Recuperação' :
                       'Pronto para o Treino'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-emerald-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {userRole === 'coach' && !selectedAthleteId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-emerald-200 transition-all">
              <div className="bg-slate-50 p-5 rounded-3xl group-hover:bg-emerald-50 transition-colors">
                 <Calendar className="w-10 h-10 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">Seus Templates</h3>
                 <p className="text-slate-500 text-sm font-medium italic">Gerencie e aplique semanas de treino pré-definidas em seu elenco.</p>
              </div>
              <Link to="/periodization" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest hover:bg-black transition-all">
                 VER TODOS
              </Link>
           </div>
           
           <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md">
                 <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 leading-none">Notificações Push</h3>
                 <p className="text-emerald-100/70 text-sm font-medium italic">Lembretes de treino automáticos para seus atletas.</p>
              </div>
              <div className="bg-emerald-400/20 px-4 py-2 rounded-lg border border-emerald-400/30">
                 <span className="text-[10px] font-black uppercase italic tracking-widest">SISTEMA ATIVO</span>
              </div>
           </div>
        </div>
      )}

      {userRole === 'athlete' && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm no-print">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 uppercase italic tracking-tighter">Lembrete de Registro</p>
              <p className="text-xs text-slate-500 font-medium italic">Não esqueça de registrar seu PSE e feedback no Portal do Atleta após cada treino para que o treinador acompanhe sua evolução.</p>
            </div>
          </div>
          <Link to="/athlete-portal" className="w-full md:w-auto bg-emerald-950 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest hover:bg-black transition-all text-center">
            Ir para o Portal
          </Link>
        </div>
      )}

      {activeAthlete && (
        <AIPerformanceHub 
          athlete={activeAthlete} 
          isAnalyzing={isAnalyzing} 
          onAnalyze={handleAIAnalysis} 
          canAnalyze={userRole === 'coach'}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group relative">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adesão ao Ciclo</p>
               <div className="relative cursor-help">
                  <Info className="w-3 h-3 text-slate-300" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[9px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    Percentual de sessões concluídas em relação ao total planejado pelo treinador.
                  </div>
               </div>
            </div>
            <p className="text-3xl font-black text-slate-800">{metrics.completionRate}%</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executado (KM)</p>
            <p className="text-3xl font-black text-emerald-600">{metrics.totalVolumeCompleted.toFixed(1)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VDOT Atual</p>
            <p className="text-3xl font-black text-slate-800">{activeAthlete?.metrics.vdot || '--'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
            <p className="text-[11px] font-black text-emerald-700 uppercase italic line-clamp-2">{athletePlan?.specificGoal || '--'}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NOVO: Painel Avançado de Energia, Prontidão & Evolução Física */}
      {activeAthlete && (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          {/* Topo do Painel com Bateria Corporal e Resumo de Energia */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <BatteryCharging className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">
                  Nível de Energia & Evolução Física
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Integração fisiológica entre Carga de Treinos (CTL/ATL/TSB/ACWR) e o Novo Modelo de Prontidão Holística do Atleta.
              </p>
            </div>
            
            {/* Medidor de Bateria Corporal do Atleta */}
            <div className={`w-full lg:w-auto p-3.5 px-5 rounded-2xl border flex items-center justify-between lg:justify-end gap-4 ${energyLevelData.bgColor}`}>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <Battery className="w-7 h-7 text-slate-700" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-900">
                    {energyLevelData.score}%
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                    Bateria Corporal Estimada
                  </span>
                  <span className={`text-xs font-black uppercase ${energyLevelData.textColor}`}>
                    {energyLevelData.label}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              {currentStress && (
                <div className="text-right hidden sm:block">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    Estado Fisiológico
                  </span>
                  <span className="text-xs font-extrabold text-slate-700">
                    {getTsbZoneInfo(currentStress.tsb).name.split(' (')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4 Cartões de Evolução Física: Condicionamento, Cansaço, Prontidão (TSB) e Razão ACWR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. CTL - Condicionamento Crônico */}
            <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9.5px] font-black text-blue-600 uppercase tracking-widest">1. Condicionamento (CTL)</span>
                  <h3 className="text-2xl font-black text-blue-950 mt-0.5">{currentStress ? Math.round(currentStress.ctl) : '0'} <span className="text-xs font-bold text-blue-600">pts</span></h3>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug font-medium">
                Carga crônica de 42 dias. Representa sua base aeróbia acumulada e capacidade de suportar volume.
              </p>
            </div>

            {/* 2. ATL - Fadiga Aguda */}
            <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9.5px] font-black text-rose-600 uppercase tracking-widest">2. Fadiga Aguda (ATL)</span>
                  <h3 className="text-2xl font-black text-rose-950 mt-0.5">{currentStress ? Math.round(currentStress.atl) : '0'} <span className="text-xs font-bold text-rose-600">pts</span></h3>
                </div>
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-600">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug font-medium">
                Cansaço agudo dos últimos 7 dias. Sobe com treinos longos e tiros; gera o estímulo para a supercompensação.
              </p>
            </div>

            {/* 3. TSB - Frescor / Forma Fisiológica */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9.5px] font-black text-emerald-700 uppercase tracking-widest">3. Frescor / Forma (TSB)</span>
                  <h3 className={`text-2xl font-black mt-0.5 ${currentStress && currentStress.tsb < 0 ? 'text-amber-700' : 'text-emerald-800'}`}>
                    {currentStress ? (currentStress.tsb > 0 ? `+${Math.round(currentStress.tsb)}` : Math.round(currentStress.tsb)) : '0'} <span className="text-xs font-bold text-emerald-600">pts</span>
                  </h3>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug font-medium">
                Diferença CTL - ATL. Valores positivos indicam pernas descansadas; valores negativos indicam carga produtiva de treino.
              </p>
            </div>

            {/* 4. ACWR - Acute:Chronic Workload Ratio (Tim Gabbett) */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-100 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-widest">4. Razão de Carga (ACWR)</span>
                  <h3 className="text-2xl font-black text-amber-950 mt-0.5">{acwrData.formatted} <span className="text-xs font-bold text-amber-600">ratio</span></h3>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${acwrData.badgeColor}`}>
                  {acwrData.label.split(' (')[0]}
                </span>
                <p className="text-[10.5px] text-slate-600 leading-tight font-medium">
                  {acwrData.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo dos Pilares de Prontidão Preenchidos pelo Atleta */}
          {activeAthlete.lastReadiness && (
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📋</span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Check-in Diário de Prontidão do Atleta ({activeAthlete.lastReadiness.date.split('-').slice(1).reverse().join('/')})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Score de Prontidão:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-black font-mono text-xs shadow-sm">
                    {activeAthlete.lastReadiness.readinessScore}%
                  </span>
                </div>
              </div>

              {/* Grid com Todos os Pilares de Saúde e Prontidão */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {/* Sono & Horas */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-500" /> Sono & Descanso
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.sleepScore}/10
                  </p>
                  <span className="text-[10px] font-bold text-slate-500">
                    {activeAthlete.lastReadiness.sleepHours ? `${activeAthlete.lastReadiness.sleepHours}h dormidas` : 'Qualidade'}
                  </span>
                </div>

                {/* Dores Musculares / DOMS + Região Anatômica */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Dor Muscular
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.sorenessScore}/10
                  </p>
                  <span className="text-[10px] font-bold text-amber-700 truncate block">
                    {activeAthlete.lastReadiness.sorenessLocation || (activeAthlete.lastReadiness.sorenessScore > 3 ? 'Geral' : 'Sem dores')}
                  </span>
                </div>

                {/* Estresse / Fadiga Mental */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Brain className="w-3 h-3 text-purple-500" /> Estresse Mental
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.stressScore}/10
                  </p>
                  <span className="text-[10px] font-bold text-slate-500">
                    {activeAthlete.lastReadiness.stressScore <= 3 ? 'Tranquilo' : activeAthlete.lastReadiness.stressScore <= 6 ? 'Moderado' : 'Estressado'}
                  </span>
                </div>

                {/* Humor & Motivação */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Smile className="w-3 h-3 text-teal-500" /> Motivação
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.moodScore}/10
                  </p>
                  <span className="text-[10px] font-bold text-teal-700">
                    {activeAthlete.lastReadiness.moodScore >= 8 ? 'Foco Máximo' : activeAthlete.lastReadiness.moodScore >= 5 ? 'Disposto' : 'Desanimado'}
                  </span>
                </div>

                {/* Hidratação Corporal */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-500" /> Hidratação
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.hydrationScore !== undefined ? `${activeAthlete.lastReadiness.hydrationScore}/10` : '8/10'}
                  </p>
                  <span className="text-[10px] font-bold text-cyan-700">
                    {(activeAthlete.lastReadiness.hydrationScore ?? 8) >= 8 ? 'Hidratado' : 'Atenção hídrica'}
                  </span>
                </div>

                {/* Frequência Cardíaca de Repouso */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> FC Repouso
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeAthlete.lastReadiness.restingHeartRate ? `${activeAthlete.lastReadiness.restingHeartRate} bpm` : '-- bpm'}
                  </p>
                  <span className="text-[10px] font-bold text-rose-700">
                    {activeAthlete.lastReadiness.restingHeartRate ? 'Matinal' : 'Não reportado'}
                  </span>
                </div>
              </div>

              {/* Informações Complementares (Mulher Atleta / PSE Pré-Treino) */}
              {(activeAthlete.lastReadiness.menstrualPhase || activeAthlete.lastReadiness.pse !== undefined) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  {activeAthlete.lastReadiness.menstrualPhase && activeAthlete.lastReadiness.menstrualPhase !== 'none' && (
                    <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-900 font-bold flex items-center gap-1.5">
                      <span>🌸</span>
                      <span>Ciclo Menstrual: <strong>
                        {activeAthlete.lastReadiness.menstrualPhase === 'follicular' && 'Fase Folicular (⚡ Estrogênio alto - Força e Energia)'}
                        {activeAthlete.lastReadiness.menstrualPhase === 'ovulatory' && 'Fase Ovulatória (🔥 Pico de Potência)'}
                        {activeAthlete.lastReadiness.menstrualPhase === 'luteal' && 'Fase Lútea (🧘 Menor tolerância a calor/fadiga)'}
                        {activeAthlete.lastReadiness.menstrualPhase === 'menstrual' && 'Fase Menstrual (🩸 Priorizar recuperação)'}
                      </strong></span>
                    </span>
                  )}
                  {activeAthlete.lastReadiness.pse !== undefined && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>PSE Pré-Treino Reportado: <strong>{activeAthlete.lastReadiness.pse}/10</strong></span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Confronto de Coerência: Fisiologia vs Percepção do Atleta */}
          {readinessConfrontation && (
            <div className={`p-6 rounded-3xl border ${
              readinessConfrontation.status === 'success' ? 'bg-emerald-50/40 border-emerald-500/20 text-slate-800' :
              readinessConfrontation.status === 'warning' ? 'bg-amber-50/40 border-amber-500/20 text-slate-800' :
              readinessConfrontation.status === 'alert' ? 'bg-rose-50/40 border-rose-500/20 text-slate-800' :
              'bg-slate-50 border-slate-200 text-slate-800'
            } space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    readinessConfrontation.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                    readinessConfrontation.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                    readinessConfrontation.status === 'alert' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    Confronto de Coerência (Fisiologia vs Percepção)
                  </span>
                  <div className="group relative cursor-help">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[9.5px] font-bold p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl leading-relaxed">
                      Cruza os dados matemáticos do modelo de estresse de Banister (CTL/ATL/TSB) com a autopercepção subjetiva de prontidão do atleta.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <span>Prontidão Declarada pelo Atleta:</span>
                  <span className="px-2.5 py-1 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-1">
                    {activeAthlete.lastReadiness ? (
                      <>
                        <span className="font-extrabold text-emerald-600 italic">{activeAthlete.lastReadiness.readinessScore}%</span>
                        <span className="text-slate-300">|</span>
                        <span>
                          {activeAthlete.lastReadiness.readinessScore >= 80 ? '⚡ Pronto' :
                           activeAthlete.lastReadiness.readinessScore >= 50 ? '🧘 Em Recuperação' : '😴 Fadigado'}
                        </span>
                      </>
                    ) : (
                      <>
                        {readinessConfrontation.subjective === 'fatigued' ? '😴 Fadigado' :
                         readinessConfrontation.subjective === 'recovering' ? '🧘 Em Recuperação' : '⚡ Pronto para Correr'}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    {readinessConfrontation.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     readinessConfrontation.status === 'alert' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> :
                     <Info className="w-4 h-4 text-amber-500" />}
                    {readinessConfrontation.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                    {readinessConfrontation.analysis}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Recomendação Técnica Integrada:</span>
                  <p className="text-xs text-slate-800 font-bold leading-relaxed mt-0.5">
                    {readinessConfrontation.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Gráficos de Evolução Física com Alternância de Abas (Stress Model vs Prontidão Holística) */}
          <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/60 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Evolução Gráfica de Performance & Prontidão
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {activeEvolutionChartTab === 'stress' 
                    ? 'Acompanhamento do Condicionamento (CTL), Cansaço (ATL) e Frescor (TSB)'
                    : 'Histórico diário de Scores de Prontidão (0-100%) e Horas de Sono'}
                </p>
              </div>

              {/* Botões de Alternância de Gráfico */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveEvolutionChartTab('stress')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeEvolutionChartTab === 'stress'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Fisiologia & Carga
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEvolutionChartTab('readiness')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeEvolutionChartTab === 'readiness'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Histórico de Prontidão
                </button>
              </div>
            </div>

            <div style={{ height: 320, width: '100%', minWidth: 0 }}>
              {activeEvolutionChartTab === 'stress' ? (
                stressTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={stressTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCtl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorAtl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorTsb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="dateStr" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginTop: '10px' }} />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />
                      
                      <Area 
                        type="monotone" 
                        dataKey="ctl" 
                        name="Condicionamento Físico (CTL)" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorCtl)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="atl" 
                        name="Cansaço Acumulado (ATL)" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorAtl)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="tsb" 
                        name="Frescor / Prontidão (TSB)" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        fillOpacity={0.15} 
                        fill="url(#colorTsb)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                    Aguardando registros de treinos concluídos com PSE e feedback para mapear evolução de carga...
                  </div>
                )
              ) : (
                readinessHistoryTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={readinessHistoryTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="dateStr" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} 
                      />
                      <YAxis 
                        domain={[0, 100]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginTop: '10px' }} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Zona Pronta (70%)', fill: '#10b981', fontSize: 10 }} />
                      <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Zona Atenção (40%)', fill: '#f59e0b', fontSize: 10 }} />
                      
                      <Area 
                        type="monotone" 
                        dataKey="readinessScore" 
                        name="Prontidão Geral (%)" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorReadiness)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="mood" 
                        name="Humor / Motivação (x10)" 
                        stroke="#06b6d4" 
                        strokeWidth={2} 
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                    Nenhum check-in diário de prontidão preenchido ainda pelo atleta no portal.
                  </div>
                )
              )}
            </div>
          </div>

          {/* Análise de Variáveis Adicionais & Recomendações do Treinador */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Análise Técnica: Variáveis Fisiológicas Adicionais & Métricas
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAdditionalMetricsInfo(!showAdditionalMetricsInfo)}
                className="text-[10px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
              >
                {showAdditionalMetricsInfo ? 'Ocultar detalhes' : 'Ver variáveis recomendadas'}
              </button>
            </div>

            {showAdditionalMetricsInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-white/10 animate-fade-in">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="font-black text-teal-300 block text-[11px]">❤️ FC de Repouso e VFC (HRV)</span>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
                    A Variabilidade da Frequência Cardíaca (VFC/rMSSD) e a FC basal refletem a atividade parassimpática autônoma. Quedas bruscas de VFC antecedem lesões por overtraining.
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="font-black text-cyan-300 block text-[11px]">💧 Hidratação e Termorregulação</span>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
                    A desidratação eleva o estresse cardiovascular em até 10 bpm na mesma velocidade de corrida, distorcendo a percepção subjetiva de esforço (PSE).
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <span className="font-black text-purple-300 block text-[11px]">🌸 Ciclo Menstrual & Variação Térmica</span>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
                    Na fase lútea tardia, o aumento de progesterona eleva a temperatura basal e a fadiga central, exigindo ajustes nos treinos em dias de calor.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter mb-6">
              <TrendingUp className="text-emerald-600 w-5 h-5" /> Distribuição de Volume Semanal
            </h2>
            <div style={{ height: 300, width: '100%', minWidth: 0 }}>
              {metrics.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={metrics.history} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10}} 
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    />
                    <Bar dataKey="planned" name="Previsto" radius={[6, 6, 0, 0]} fill="#e2e8f0">
                       <LabelList dataKey="planned" position="top" style={{ fill: '#94a3b8', fontSize: '9px', fontWeight: '900' }} offset={10} />
                    </Bar>
                    <Bar dataKey="completed" name="Executado" radius={[6, 6, 0, 0]} fill="#10b981">
                       <LabelList dataKey="completed" position="top" style={{ fill: '#10b981', fontSize: '9px', fontWeight: '900' }} offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] italic">
                  Aguardando dados de periodização...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-lg">
                <MessageSquare className="text-emerald-500 w-5 h-5" /> Feed de Atividades
              </h3>
              {userRole === 'coach' && selectedAthleteId && (
                <button 
                  onClick={() => setSelectedAthleteId(null)}
                  className="text-[9px] font-black text-emerald-600 uppercase italic border border-emerald-100 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Ver Todos
                </button>
              )}
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {allActivities.length > 0 ? allActivities.slice(-8).reverse().map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">{f.athleteName}</p>
                          <p className="text-[8px] text-slate-400 uppercase font-black">{f.day}</p>
                       </div>
                       {f.rpe > 0 && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                           <Zap className="w-3 h-3 text-amber-500" />
                           <span className="text-[9px] font-black text-slate-700">PSE {f.rpe}</span>
                        </div>
                       )}
                    </div>
                    <p className="text-[11px] text-slate-600 italic border-l-2 border-emerald-300 pl-3 leading-snug">
                       {f.feedback ? `"${f.feedback}"` : "Sessão concluída conforme prescrição."}
                    </p>
                </div>
              )) : <p className="text-slate-300 text-xs italic text-center py-10 uppercase tracking-widest font-black">Nenhuma sessão executada.</p>}
            </div>
            
            {nextWorkout && (
              <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="bg-emerald-950 rounded-2xl p-5 text-white shadow-xl">
                  <p className="text-[9px] font-black uppercase text-emerald-400 mb-2 tracking-widest flex items-center gap-2">
                    <Target className="w-3 h-3" /> Foco da Próxima Sessão
                  </p>
                  <p className="text-xs font-bold italic line-clamp-2 leading-relaxed opacity-90 mb-4">"{nextWorkout.customDescription}"</p>
                  <Link to="/athlete-portal" className="w-full text-[10px] font-black uppercase text-white bg-emerald-700/50 hover:bg-emerald-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    ABRIR PORTAL DO ATLETA <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
