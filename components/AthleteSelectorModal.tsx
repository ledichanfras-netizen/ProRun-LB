import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { 
  Users, 
  Search, 
  X, 
  CheckCircle, 
  UserCheck, 
  Activity, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react';
import { Athlete } from '../types';

interface AthleteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const AthleteSelectorModal: React.FC<AthleteSelectorModalProps> = ({
  isOpen,
  onClose,
  title = "Atleta em Foco",
  subtitle = "Selecione o aluno para analisar, periodizar e gerenciar treinos"
}) => {
  const { athletes, selectedAthleteId, setSelectedAthleteId, athletePlans, getAthleteMetrics } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'with_plan' | 'no_plan'>('all');

  const filteredAthletes = useMemo(() => {
    return athletes.filter(athlete => {
      const matchesSearch = 
        athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.experience.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasPlan = Boolean(athletePlans[athlete.id]?.weeks?.length);
      if (filterMode === 'with_plan') return hasPlan;
      if (filterMode === 'no_plan') return !hasPlan;
      return true;
    }).sort((a, b) => {
      // Put currently selected first, then alphabetical
      if (a.id === selectedAthleteId) return -1;
      if (b.id === selectedAthleteId) return 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [athletes, searchTerm, filterMode, athletePlans, selectedAthleteId]);

  const handleSelect = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    onClose();
  };

  const handleClearSelection = () => {
    setSelectedAthleteId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#090d1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white z-10"
        >
          {/* Header */}
          <div className="p-6 sm:p-7 border-b border-white/5 bg-slate-950/60 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 italic">
                    Troca Rápida de Aluno
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {athletes.length} {athletes.length === 1 ? 'cadastrado' : 'cadastrados'}
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-white mt-1">
                  {title}
                </h3>
                <p className="text-xs text-slate-400 italic">
                  {subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all border border-white/5"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-5 sm:p-6 border-b border-white/5 bg-slate-950/30 space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail ou nível..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all border ${
                  filterMode === 'all'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                Todos ({athletes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('with_plan')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all border ${
                  filterMode === 'with_plan'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                Com Ciclo Ativo ({athletes.filter(a => athletePlans[a.id]?.weeks?.length).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('no_plan')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all border ${
                  filterMode === 'no_plan'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                Sem Ciclo ({athletes.filter(a => !athletePlans[a.id]?.weeks?.length).length})
              </button>
            </div>
          </div>

          {/* Athletes List */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-2.5 flex-1 max-h-[50vh]">
            {filteredAthletes.length > 0 ? (
              filteredAthletes.map((athlete) => {
                const isSelected = athlete.id === selectedAthleteId;
                const plan = athletePlans[athlete.id];
                const hasPlan = Boolean(plan?.weeks?.length);
                const metrics = getAthleteMetrics ? getAthleteMetrics(athlete.id) : null;

                return (
                  <div
                    key={athlete.id}
                    onClick={() => handleSelect(athlete.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-base transition-all shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-white/10 text-slate-300 group-hover:bg-emerald-500 group-hover:text-white'
                      }`}>
                        {athlete.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm uppercase italic tracking-tight text-white group-hover:text-emerald-300 transition-colors truncate">
                            {athlete.name}
                          </h4>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 italic tracking-wider shrink-0">
                              <CheckCircle className="w-2.5 h-2.5" /> Em Foco
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap font-medium">
                          <span className="text-slate-300 font-bold">{athlete.experience}</span>
                          {athlete.metrics?.vdot && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">VDOT {athlete.metrics.vdot}</span>
                            </>
                          )}
                          {metrics && (
                            <>
                              <span>•</span>
                              <span className={`${metrics.completionRate < 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                                {metrics.completionRate.toFixed(0)}% adesão
                              </span>
                            </>
                          )}
                        </div>

                        {/* Plan Tag */}
                        <div className="mt-1.5 flex items-center gap-2">
                          {hasPlan ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <Calendar className="w-3 h-3" />
                              Ciclo: {plan.specificGoal || 'Personalizado'} ({plan.weeks.length} sem)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                              Sem ciclo ativo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ativo</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500 text-slate-300 hover:text-white font-black text-xs uppercase italic tracking-wider flex items-center gap-1.5 transition-all border border-white/10 group-hover:border-emerald-500/30"
                        >
                          <span>Focar</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-black uppercase italic text-xs tracking-widest">
                  Nenhum aluno encontrado
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Verifique o termo buscado ou o filtro selecionado.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 border-t border-white/5 bg-slate-950/60 flex items-center justify-between gap-3">
            <div>
              {selectedAthleteId ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-bold text-red-400/80 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                  Remover Atleta em Foco
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Nenhum aluno focado atualmente
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all uppercase text-xs tracking-wider"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
