
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Workout } from '../types';
import { Book, Plus, Clock, Zap, Info, Trash2, Edit2, Save, X, AlertTriangle } from 'lucide-react';

const Library: React.FC = () => {
  const { workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  const [formWorkout, setFormWorkout] = useState<Partial<Workout>>({
    title: '', type: 'Recovery', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateLibraryWorkout(editingId, formWorkout);
      } else {
        await addWorkout({ ...formWorkout as Workout, id: crypto.randomUUID() });
      }

      // Reset
      setShowForm(false);
      setEditingId(null);
      setFormWorkout({ title: '', type: 'Recovery', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3 });
    } catch (err) {
      console.error("Erro ao salvar treino:", err);
      alert("Erro ao salvar treino na biblioteca.");
    }
  };

  const handleEdit = (workout: Workout) => {
    setEditingId(workout.id);
    setFormWorkout(workout);
    setShowForm(true);
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
          case 'Recovery': return 'Recuperação';
          case 'Long Run': return 'Longão';
          case 'Tempo': return 'Tempo';
          case 'Interval': return 'Intervalado';
          case 'Speed': return 'Velocidade';
          default: return type;
      }
  }

  return (
    <div className="space-y-6 relative">
      
      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-bold">Excluir Treino?</h3>
             </div>
             <p className="text-slate-600 mb-2">
               Você vai excluir da biblioteca:
             </p>
             <p className="font-bold text-slate-800 mb-6 italic">"{deleteModal.title}"</p>
             <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
               >
                 Cancelar
               </button>
               <button 
                 onClick={executeDelete}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md"
               >
                 Sim, Excluir
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Biblioteca de Treinos</h1>
          <p className="text-slate-500">Banco de dados de treinos padronizados</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormWorkout({ title: '', type: 'Recovery', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3 });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Novo Treino
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 animate-fade-in-down">
          <div className="flex justify-between items-center mb-6 border-b pb-2">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Editar Treino' : 'Cadastrar Novo Treino'}</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Título */}
            <div className="col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Treino</label>
              <input 
                placeholder="Ex: Fartlek Piramidal" 
                className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                value={formWorkout.title} 
                onChange={e => setFormWorkout({...formWorkout, title: e.target.value})} 
                required
              />
              <p className="text-xs text-slate-400 mt-1">Dê um nome curto e identificável.</p>
            </div>

            {/* Tipo */}
            <div className="col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Sessão</label>
              <select 
                className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formWorkout.type}
                onChange={e => setFormWorkout({...formWorkout, type: e.target.value as any})}
              >
                <option value="Recovery">Recuperação (Regenerativo)</option>
                <option value="Long Run">Longão (Resistência)</option>
                <option value="Tempo">Tempo (Ritmo de Prova/Limiar)</option>
                <option value="Interval">Intervalado (VO2Max)</option>
                <option value="Speed">Velocidade (Repetições Curtas)</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Define a cor e categoria no calendário.</p>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Estrutura do Treino (Descrição Completa)</label>
              <textarea 
                placeholder="Ex: 15min Aquece (Z1) + 5x 1000m (Z4) c/ 2min pausa leve + 10min Desaquece" 
                className="w-full border border-slate-300 p-3 rounded h-28 focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={formWorkout.description}
                onChange={e => setFormWorkout({...formWorkout, description: e.target.value})}
              />
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <Info className="w-3 h-3" />
                <span>Descreva o aquecimento, parte principal e desaquecimento detalhadamente.</span>
              </div>
            </div>

            {/* Métricas */}
            <div className="md:col-span-2 grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração (min)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 60" 
                    className="w-full border border-slate-300 p-2 rounded"
                    value={formWorkout.durationMinutes}
                    onChange={e => setFormWorkout({...formWorkout, durationMinutes: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Distância (km)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 10" 
                    className="w-full border border-slate-300 p-2 rounded"
                    value={formWorkout.distanceKm}
                    onChange={e => setFormWorkout({...formWorkout, distanceKm: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PSE (1-10)</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 7" 
                    className="w-full border border-slate-300 p-2 rounded"
                    min="1" max="10"
                    value={formWorkout.rpe}
                    onChange={e => setFormWorkout({...formWorkout, rpe: Number(e.target.value)})}
                  />
               </div>
               <div className="col-span-3 text-xs text-slate-400 text-center">
                 Estimativas para cálculo de volume e carga.
               </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
               <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
               >
                 Cancelar
               </button>
               <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2">
                 {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                 {editingId ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workouts.map(w => (
          <div key={w.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group relative">
            
            {/* Actions */}
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg p-1 border border-slate-100">
               <button 
                onClick={() => handleEdit(w)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                 <Edit2 className="w-4 h-4" />
               </button>
               <button 
                type="button"
                onClick={(e) => confirmDelete(e, w.id, w.title)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>

            <div className="flex justify-between items-start mb-3">
              <span className={`
                px-2 py-1 text-xs font-bold uppercase rounded
                ${w.type === 'Recovery' ? 'bg-blue-100 text-blue-700' : 
                  w.type === 'Tempo' ? 'bg-yellow-100 text-yellow-700' :
                  w.type === 'Interval' ? 'bg-orange-100 text-orange-700' :
                  w.type === 'Long Run' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'}
              `}>
                {mapType(w.type)}
              </span>
              <div className="flex items-center gap-1 text-slate-400 text-xs pr-8">
                 <Zap className="w-3 h-3" /> PSE {w.rpe}
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">{w.title}</h3>
            <p className="text-slate-600 text-sm mb-4 line-clamp-3">{w.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500 border-t pt-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {w.durationMinutes} min
              </div>
              <div className="flex items-center gap-1">
                <Book className="w-3 h-3" /> {w.distanceKm} km
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;
