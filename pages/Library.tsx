
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Workout, Exercise } from '../types';
import { Book, Plus, Clock, Zap, Info, Trash2, Edit2, Save, X, AlertTriangle, Search, Dumbbell, ListOrdered } from 'lucide-react';

const Library: React.FC = () => {
  const { workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [formWorkout, setFormWorkout] = useState<Partial<Workout>>({
    title: '', type: 'Regenerativo', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3, exercises: []
  });
  
  // Filter workouts
  const filteredWorkouts = workouts.filter(w => 
    w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          case 'Velocidade': return 'Velocidade';
          case 'Fortalecimento': return 'Fortalecimento';
          case 'Prova': return 'Prova';
          default: return type;
      }
  }

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
                 className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:text-slate-600 tracking-widest italic transition"
               >
                 CANCELAR
               </button>
               <button 
                 onClick={executeDelete}
                 className="px-8 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black text-xs uppercase shadow-xl tracking-widest italic flex items-center gap-2 transition-all hover:scale-105"
               >
                 <Trash2 className="w-4 h-4" /> SIM, EXCLUIR
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Biblioteca de Treinos</h1>
          <p className="text-slate-400 font-medium italic">Banco de dados de sessões padronizadas para prescrição rápida.</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormWorkout({ title: '', type: 'Regenerativo', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3, exercises: [] });
          }}
          className="w-full md:w-auto bg-emerald-950 hover:bg-black text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> NOVO TREINO
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Velocidade', 'Prova'].map(type => {
          const count = workouts.filter(w => w.type === type).length;
          return (
            <div key={type} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{mapType(type)}</p>
              <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
        <input 
          type="text" 
          placeholder="PESQUISAR NA BIBLIOTECA (NOME, TIPO OU DESCRIÇÃO)..." 
          className="pro-input w-full pl-12 pr-4 uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="bg-slate-900/80 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/5 animate-fade-in-up relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          
          <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/20">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {editingId ? 'Editar Sessão' : 'Nova Sessão Técnica'}
              </h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white hover:bg-white/5 p-3 rounded-full transition">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Título */}
            <div className="col-span-1">
              <label className="pro-label">Nome do Treino</label>
              <input 
                placeholder="Ex: Fartlek Piramidal 1-2-3-2-1" 
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
                <option value="Longão" className="bg-slate-900">Longão</option>
                <option value="Limiar" className="bg-slate-900">Limiar</option>
                <option value="Intervalado" className="bg-slate-900">Intervalado</option>
                <option value="Velocidade" className="bg-slate-900">Velocidade</option>
                <option value="Fortalecimento" className="bg-slate-900">Fortalecimento</option>
                <option value="Prova" className="bg-slate-900">Prova (Dia de Prova)</option>
              </select>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="pro-label">Estrutura do Treino (Descrição Técnica)</label>
              <textarea 
                placeholder="Ex: 15min Aquece (Z1) + 5x 1000m (Z4) c/ 2min pausa leve + 10min Desaquece" 
                className="pro-input w-full h-32 font-medium italic resize-none"
                value={formWorkout.description}
                onChange={e => setFormWorkout({...formWorkout, description: e.target.value})}
              />
            </div>

            {/* Exercícios Detalhados (Modo Elite Torneio) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="pro-label flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" /> Detalhamento de Exercícios (Elite)
                </label>
                <button 
                  type="button"
                  onClick={addExercise}
                  className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all uppercase italic flex items-center gap-1"
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
                          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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
                   <p className="text-[10px] font-bold text-slate-500 italic">Nenhum exercício registrado. Ideal para treinos de fortalecimento.</p>
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
                className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest italic hover:text-slate-600 transition"
               >
                 CANCELAR
               </button>
               <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105 flex items-center gap-2">
                 {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                 {editingId ? 'ATUALIZAR SESSÃO' : 'SALVAR NA BIBLIOTECA'}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredWorkouts.length > 0 ? filteredWorkouts.map(w => (
          <div key={w.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative flex flex-col overflow-hidden">
            
            {/* Indicator Bar */}
            <div className={`h-2 w-full ${
              w.type === 'Regenerativo' ? 'bg-emerald-400' : 
              w.type === 'Limiar' ? 'bg-amber-500' :
              w.type === 'Intervalado' ? 'bg-red-500' :
              w.type === 'Longão' ? 'bg-emerald-600' :
              w.type === 'Prova' ? 'bg-amber-600' :
              'bg-purple-500'
            }`} />

            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`
                  px-3 py-1 text-[10px] font-black uppercase italic tracking-widest rounded-lg border
                  ${w.type === 'Regenerativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    w.type === 'Limiar' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    w.type === 'Intervalado' ? 'bg-red-50 text-red-700 border-red-100' :
                    w.type === 'Longão' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    w.type === 'Prova' ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/25 font-bold' :
                    'bg-purple-50 text-purple-700 border-purple-100'}
                `}>
                  {mapType(w.type)}
                </span>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => handleEdit(w)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Editar">
                     <Edit2 className="w-4 h-4" />
                   </button>
                   <button 
                    type="button"
                    onClick={(e) => confirmDelete(e, w.id, w.title)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Excluir">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <h3 className="font-black text-slate-900 text-xl mb-3 uppercase italic tracking-tighter leading-tight">{w.title}</h3>
              <p className="text-slate-500 text-sm mb-6 line-clamp-4 italic font-medium leading-relaxed">"{w.description}"</p>
              
              <div className="mt-auto grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo</p>
                  <div className="flex items-center justify-center gap-1 text-slate-700 font-black italic">
                    <Clock className="w-3 h-3 text-emerald-500" /> {w.durationMinutes}'
                  </div>
                </div>
                <div className="text-center border-x border-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                  <div className="flex items-center justify-center gap-1 text-slate-700 font-black italic">
                    <Book className="w-3 h-3 text-emerald-500" /> {w.distanceKm}k
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Esforço</p>
                  <div className="flex items-center justify-center gap-1 text-slate-700 font-black italic">
                    <Zap className="w-3 h-3 text-amber-500" /> {w.rpe}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
             <Book className="w-16 h-16 text-slate-100 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest italic">Nenhum treino encontrado na biblioteca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
