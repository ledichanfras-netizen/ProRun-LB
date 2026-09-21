
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Workout, Exercise } from '../types';
import { 
  Book, 
  Plus, 
  Clock, 
  Zap, 
  Info, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  AlertTriangle, 
  Search, 
  Dumbbell, 
  ListOrdered, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Target,
  Flame,
  Activity,
  Layers
} from 'lucide-react';

const Library: React.FC = () => {
  const { workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout, seedDefaultWorkouts } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedDistance, setSelectedDistance] = useState<string>('TODAS');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [formWorkout, setFormWorkout] = useState<Partial<Workout>>({
    title: '', type: 'Regenerativo', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3, exercises: []
  });
  
  // Filter workouts
  const filteredWorkouts = workouts.filter(w => {
    const matchesSearch = 
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.exercises && w.exercises.some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesType = selectedType === 'TODOS' || w.type === selectedType;

    let matchesDistance = true;
    if (selectedDistance === '5k') {
      matchesDistance = w.title.toLowerCase().includes('5k') || (w.distanceKm >= 4 && w.distanceKm <= 7);
    } else if (selectedDistance === '10k') {
      matchesDistance = w.title.toLowerCase().includes('10k') || (w.distanceKm >= 8 && w.distanceKm <= 12);
    } else if (selectedDistance === '21k') {
      matchesDistance = w.title.toLowerCase().includes('21k') || w.title.toLowerCase().includes('meia') || (w.distanceKm >= 13 && w.distanceKm <= 23);
    } else if (selectedDistance === '42k') {
      matchesDistance = w.title.toLowerCase().includes('42k') || w.title.toLowerCase().includes('maratona') || w.distanceKm >= 24;
    }

    return matchesSearch && matchesType && matchesDistance;
  });

  const handleSyncDefaults = async () => {
    setIsSyncing(true);
    try {
      await seedDefaultWorkouts();
      setSyncFeedback('30 Treinos de Elite Sincronizados com Sucesso! ⚡');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e) {
      console.error(e);
      setSyncFeedback('Erro ao sincronizar treinos.');
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateLibraryWorkout(editingId, formWorkout);
    } else {
      addWorkout({ ...formWorkout as Workout, id: crypto.randomUUID() });
    }
    
    // Reset
    setShowForm(false);
    setEditingId(null);
    setFormWorkout({ title: '', type: 'Regenerativo', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3, exercises: [] });
  };

  const handleEdit = (workout: Workout) => {
    setEditingId(workout.id);
    setFormWorkout({
      ...workout,
      exercises: workout.exercises || []
    });
    setShowForm(true);
  };

  const addExercise = () => {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      sets: '',
      reps: '',
      load: '',
      order: (formWorkout.exercises?.length || 0) + 1
    };
    setFormWorkout({
      ...formWorkout,
      exercises: [...(formWorkout.exercises || []), newExercise]
    });
  };

  const updateExercise = (id: string, field: keyof Exercise, value: any) => {
    setFormWorkout({
      ...formWorkout,
      exercises: (formWorkout.exercises || []).map(ex => 
        ex.id === id ? { ...ex, [field]: value } : ex
      )
    });
  };

  const removeExercise = (id: string) => {
    setFormWorkout({
      ...formWorkout,
      exercises: (formWorkout.exercises || []).filter(ex => ex.id !== id)
    });
  };

  // Open Delete Modal
  const confirmDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, title });
  };

  // Execute Delete
  const executeDelete = async () => {
    if (deleteModal.id) {
      await deleteLibraryWorkout(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, title: '' });
    }
  };

  const mapType = (type: string) => {
    switch(type) {
      case 'Regenerativo': return 'Regenerativo';
      case 'Longão': return 'Longão';
      case 'Limiar': return 'Limiar';
      case 'Intervalado': return 'Intervalado';
      case 'Maratona': return 'Maratona';
      case 'Velocidade': return 'Velocidade';
      case 'Fortalecimento': return 'Fortalecimento';
      case 'Prova': return 'Prova';
      default: return type;
    }
  };

  const workoutTypesList = [
    { key: 'TODOS', label: 'Todos os Treinos', count: workouts.length },
    { key: 'Regenerativo', label: 'Regenerativo', count: workouts.filter(w => w.type === 'Regenerativo').length },
    { key: 'Maratona', label: 'Maratona', count: workouts.filter(w => w.type === 'Maratona').length },
    { key: 'Intervalado', label: 'Intervalado', count: workouts.filter(w => w.type === 'Intervalado').length },
    { key: 'Limiar', label: 'Limiar', count: workouts.filter(w => w.type === 'Limiar').length },
    { key: 'Velocidade', label: 'Velocidade', count: workouts.filter(w => w.type === 'Velocidade').length },
    { key: 'Longão', label: 'Longão', count: workouts.filter(w => w.type === 'Longão').length },
    { key: 'Fortalecimento', label: 'Fortalecimento', count: workouts.filter(w => w.type === 'Fortalecimento').length },
    { key: 'Prova', label: 'Prova', count: workouts.filter(w => w.type === 'Prova').length },
  ];

  return (
    <div className="space-y-6 relative">
      
      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full animate-fade-in-up border-l-8 border-red-500">
             <div className="flex items-center gap-4 text-red-600 mb-6">
               <div className="bg-red-50 p-3 rounded-2xl">
                  <AlertTriangle className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Excluir da Biblioteca?</h3>
             </div>
             <p className="text-slate-600 mb-2 font-medium italic">
               Você está prestes a remover permanentemente:
             </p>
             <p className="font-black text-xl text-slate-800 mb-8 uppercase italic tracking-tighter">"{deleteModal.title}"</p>
             <div className="flex gap-4 justify-end">
               <button 
                 onClick={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
                 className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:text-slate-600 tracking-widest italic transition cursor-pointer"
               >
                 CANCELAR
               </button>
               <button 
                 onClick={executeDelete}
                 className="px-8 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black text-xs uppercase shadow-xl tracking-widest italic flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
               >
                 <Trash2 className="w-4 h-4" /> SIM, EXCLUIR
               </button>
             </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/60 p-6 sm:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Biblioteca de Treinos ProRun</h1>
          </div>
          <p className="text-slate-400 font-medium italic text-sm">
            Acervo científico de sessões padronizadas (5 para cada tipo e distância) baseado na metodologia Jack Daniels e Joe Friel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button 
            type="button"
            onClick={handleSyncDefaults}
            disabled={isSyncing}
            className="flex-1 lg:flex-initial bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase italic tracking-wider shadow-lg transition-all hover:scale-102 cursor-pointer"
            title="Recarrega os 30 treinos de elite para todas as modalidades e distâncias"
          >
            <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Restaurar 30 Treinos Padrão'}
          </button>

          <button 
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormWorkout({ title: '', type: 'Regenerativo', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3, exercises: [] });
            }}
            className="flex-1 lg:flex-initial bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" /> NOVO TREINO
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 font-bold text-xs uppercase italic flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          {syncFeedback}
        </div>
      )}

      {/* CATEGORY METRIC COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {workoutTypesList.slice(1, 8).map(t => {
          const isSelected = selectedType === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedType(isSelected ? 'TODOS' : t.key)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/30' 
                  : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-white/5 hover:border-emerald-500/40'
              }`}
            >
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.label}</p>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter">{t.count}</p>
                <span className="text-[9px] font-bold text-emerald-500">sessões</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTER CONTROLS: SEARCH, TYPE TABS & DISTANCE TAGS */}
      <div className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-white/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="PESQUISAR NA BIBLIOTECA (NOME, TIPO, RITMO OU EXERCÍCIO)..." 
              className="pro-input w-full pl-12 pr-4 uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {workoutTypesList.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic whitespace-nowrap transition-all cursor-pointer ${
                selectedType === tab.key
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Distance / Goal Tags */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" /> Distância:
          </span>
          {['TODAS', '5k', '10k', '21k', '42k'].map(dist => (
            <button
              key={dist}
              type="button"
              onClick={() => setSelectedDistance(dist)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                selectedDistance === dist
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {dist === 'TODAS' ? 'Todas as Distâncias' : dist === '21k' ? '21k (Meia)' : dist === '42k' ? '42k (Maratona)' : dist}
            </button>
          ))}
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <div className="bg-slate-900/90 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/10 animate-fade-in-up relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          
          <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/20">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {editingId ? 'Editar Sessão Técnica' : 'Nova Sessão Técnica'}
              </h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white hover:bg-white/5 p-3 rounded-full transition cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Título */}
            <div className="col-span-1">
              <label className="pro-label">Nome do Treino</label>
              <input 
                placeholder="Ex: Tiros de 1000m VO2max Z4 (5k/10k)" 
                className="pro-input w-full font-black text-lg italic uppercase" 
                value={formWorkout.title} 
                onChange={e => setFormWorkout({...formWorkout, title: e.target.value})} 
                required
              />
            </div>

            {/* Tipo */}
            <div className="col-span-1">
              <label className="pro-label">Tipo de Sessão</label>
              <select 
                className="pro-input w-full font-black italic cursor-pointer"
                value={formWorkout.type}
                onChange={e => setFormWorkout({...formWorkout, type: e.target.value as any})}
              >
                <option value="Regenerativo" className="bg-slate-900">Regenerativo</option>
                <option value="Maratona" className="bg-slate-900">Maratona (Ritmo Específico)</option>
                <option value="Intervalado" className="bg-slate-900">Intervalado (VO2max / Tiros)</option>
                <option value="Limiar" className="bg-slate-900">Limiar (Threshold / T-Pace)</option>
                <option value="Velocidade" className="bg-slate-900">Velocidade (R-Pace / Pista / Rampa)</option>
                <option value="Longão" className="bg-slate-900">Longão (Construção / Progressivo)</option>
                <option value="Fortalecimento" className="bg-slate-900">Fortalecimento</option>
                <option value="Prova" className="bg-slate-900">Prova (Dia de Competição)</option>
              </select>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="pro-label">Estrutura do Treino (Descrição Técnica & Sintaxe GPS)</label>
              <textarea 
                placeholder="Ex: 2km aq + 6x 1000m rec 2min ritmo 04:15 a 04:25 + 1km des" 
                className="pro-input w-full h-32 font-medium italic resize-none"
                value={formWorkout.description}
                onChange={e => setFormWorkout({...formWorkout, description: e.target.value})}
              />
            </div>

            {/* Exercícios Detalhados (Modo Elite Torneio) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="pro-label flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" /> Detalhamento de Exercícios / Educativos (Elite)
                </label>
                <button 
                  type="button"
                  onClick={addExercise}
                  className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all uppercase italic flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Adicionar Exercício
                </button>
              </div>

              {formWorkout.exercises && formWorkout.exercises.length > 0 ? (
                <div className="space-y-3">
                  {formWorkout.exercises.map((ex, idx) => (
                    <div key={ex.id} className="grid grid-cols-12 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group animate-fade-in">
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-[10px] font-black text-slate-500">#{idx + 1}</span>
                      </div>
                      <div className="col-span-5 md:col-span-4">
                        <input 
                          placeholder="Nome do Exercício"
                          className="pro-input w-full text-xs"
                          value={ex.name}
                          onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          placeholder="Séries"
                          className="pro-input w-full text-xs text-center"
                          value={ex.sets}
                          onChange={e => updateExercise(ex.id, 'sets', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          placeholder="Reps"
                          className="pro-input w-full text-xs text-center"
                          value={ex.reps}
                          onChange={e => updateExercise(ex.id, 'reps', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <input 
                          placeholder="Carga"
                          className="pro-input w-full text-xs text-center"
                          value={ex.load}
                          onChange={e => updateExercise(ex.id, 'load', e.target.value)}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex items-center justify-end">
                        <button 
                          type="button"
                          onClick={() => removeExercise(ex.id)}
                          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                   <Dumbbell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                   <p className="text-[10px] font-bold text-slate-500 italic">Nenhum exercício registrado. Ideal para treinos de fortalecimento e educativos.</p>
                </div>
              )}
            </div>

            {/* Métricas */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
               <div>
                  <label className="pro-label">Duração (min)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 60" 
                    className="pro-input w-full"
                    value={formWorkout.durationMinutes === 0 ? '' : formWorkout.durationMinutes}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormWorkout({...formWorkout, durationMinutes: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="pro-label">Distância (km)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 10" 
                    className="pro-input w-full"
                    value={formWorkout.distanceKm === 0 ? '' : formWorkout.distanceKm}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormWorkout({...formWorkout, distanceKm: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="pro-label">Esforço (PSE 1-10)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 7" 
                    className="pro-input w-full"
                    min="1" max="10"
                    value={formWorkout.rpe === 0 ? '' : formWorkout.rpe}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormWorkout({...formWorkout, rpe: Number(e.target.value)})}
                  />
               </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-6 pt-4">
               <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest italic hover:text-slate-600 transition cursor-pointer"
               >
                 CANCELAR
               </button>
               <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105 flex items-center gap-2 cursor-pointer">
                 {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                 {editingId ? 'ATUALIZAR SESSÃO' : 'SALVAR NA BIBLIOTECA'}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* WORKOUTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkouts.length > 0 ? filteredWorkouts.map(w => (
          <div key={w.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 hover:border-emerald-500/30 hover:shadow-xl transition-all group relative flex flex-col overflow-hidden">
            
            {/* Indicator Bar */}
            <div className={`h-2 w-full ${
              w.type === 'Regenerativo' ? 'bg-emerald-400' : 
              w.type === 'Limiar' ? 'bg-amber-500' :
              w.type === 'Intervalado' ? 'bg-red-500' :
              w.type === 'Maratona' ? 'bg-sky-500' :
              w.type === 'Longão' ? 'bg-emerald-600' :
              w.type === 'Velocidade' ? 'bg-fuchsia-500' :
              w.type === 'Prova' ? 'bg-amber-600' :
              'bg-purple-500'
            }`} />

            <div className="p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <span className={`
                    px-3 py-1 text-[10px] font-black uppercase italic tracking-widest rounded-lg border
                    ${w.type === 'Regenerativo' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 
                      w.type === 'Limiar' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' :
                      w.type === 'Intervalado' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30' :
                      w.type === 'Maratona' ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30 font-bold' :
                      w.type === 'Longão' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' :
                      w.type === 'Velocidade' ? 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30' :
                      w.type === 'Prova' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 ring-2 ring-amber-500/25 font-bold' :
                      'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'}
                  `}>
                    {mapType(w.type)}
                  </span>
                  
                  <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => handleEdit(w)}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer" title="Editar">
                       <Edit2 className="w-3.5 h-3.5" />
                     </button>
                     <button 
                      type="button"
                      onClick={(e) => confirmDelete(e, w.id, w.title)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer" title="Excluir">
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                </div>

                <h3 className="font-black text-slate-900 dark:text-white text-lg mb-2 uppercase italic tracking-tighter leading-snug">
                  {w.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 line-clamp-4 italic font-medium leading-relaxed">
                  "{w.description}"
                </p>

                {/* Exercises Badge if present */}
                {w.exercises && w.exercises.length > 0 && (
                  <div className="mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1 mb-1">
                      <Dumbbell className="w-3 h-3" /> {w.exercises.length} Exercícios / Educativos:
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate italic">
                      {w.exercises.map(e => e.name).join(' • ')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tempo</p>
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 font-black text-xs italic">
                    <Clock className="w-3 h-3 text-emerald-500" /> {w.durationMinutes}'
                  </div>
                </div>
                <div className="text-center border-x border-slate-100 dark:border-white/5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Volume</p>
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 font-black text-xs italic">
                    <Book className="w-3 h-3 text-emerald-500" /> {w.distanceKm}k
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Esforço</p>
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 font-black text-xs italic">
                    <Zap className="w-3 h-3 text-amber-500" /> PSE {w.rpe}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10">
             <Book className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
             <p className="text-slate-400 font-black uppercase tracking-widest italic text-xs mb-3">
               Nenhum treino encontrado com os filtros selecionados.
             </p>
             <button
               type="button"
               onClick={handleSyncDefaults}
               className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
             >
               Restaurar 30 Treinos da Biblioteca
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;

