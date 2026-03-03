import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Workout } from '../types';
import { Plus, Trash2, Edit2, X, Search, Zap, Clock, Book, Save, Info, AlertCircle } from 'lucide-react';
import { withTimeout } from '../utils/helpers';

const Library: React.FC = () => {
  const { workouts, addWorkout, updateLibraryWorkout, deleteLibraryWorkout } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null, name: string}>({
    isOpen: false,
    id: null,
    name: ''
  });

  const [formWorkout, setFormWorkout] = useState<Partial<Workout>>({
    title: '',
    type: 'Recovery',
    description: '',
    durationMinutes: 30,
    distanceKm: 5,
    rpe: 3
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (editingId) {
        await withTimeout(updateLibraryWorkout(editingId, formWorkout));
      } else {
        await withTimeout(addWorkout({
          ...formWorkout as Workout,
          id: crypto.randomUUID(),
          isVisible: true
        }));
      }
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar treino:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (w: Workout) => {
    setEditingId(w.id);
    setFormWorkout(w);
    setShowForm(true);
  };

  const confirmDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (deleteModal.id) {
      try {
        await withTimeout(deleteLibraryWorkout(deleteModal.id));
        setDeleteModal({ isOpen: false, id: null, name: '' });
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  const mapType = (type: string) => {
    switch (type) {
      case 'Recovery': return 'Recuperação';
      case 'Long Run': return 'Longão';
      case 'Tempo': return 'Tempo';
      case 'Interval': return 'Intervalado';
      case 'Speed': return 'Velocidade';
      case 'Prova': return 'Prova';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fade-in-up border-t-8 border-red-500">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertCircle className="w-6 h-6" />
               <h3 className="text-xl font-bold">Excluir Treino?</h3>
             </div>
             <p className="text-slate-600 mb-6">Confirma a remoção permanente de <strong>{deleteModal.name}</strong> da biblioteca?</p>
             <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                 className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px]"
               >
                 Cancelar
               </button>
               <button 
                 onClick={executeDelete}
                 className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-black text-[10px] uppercase italic shadow-lg"
               >
                 Sim, Excluir
               </button>
             </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <Book className="text-emerald-600 w-8 h-8" /> Biblioteca de Treinos
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Banco de dados de sessões técnicas padronizadas.</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormWorkout({ title: '', type: 'Recovery', description: '', durationMinutes: 30, distanceKm: 5, rpe: 3 });
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Treino
        </button>
      </header>

      {showForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-emerald-100 animate-fade-in-up">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
              {editingId ? <Edit2 className="text-emerald-600" /> : <Plus className="text-emerald-600" />}
              {editingId ? 'Editar Treino' : 'Nova Sessão Técnica'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título da Sessão</label>
                <input
                  placeholder="Ex: Fartlek Piramidal"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formWorkout.title}
                  onChange={e => setFormWorkout({...formWorkout, title: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                <div className="relative">
                  <select
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                    value={formWorkout.type}
                    onChange={e => setFormWorkout({...formWorkout, type: e.target.value as any})}
                  >
                    <option value="Recovery">Recuperação</option>
                    <option value="Long Run">Resistência (Longão)</option>
                    <option value="Tempo">Ritmo / Limiar</option>
                    <option value="Interval">Intervalado (VO2Max)</option>
                    <option value="Speed">Velocidade</option>
                    <option value="Prova">Prova</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Duração (m)</label>
                    <input
                      type="number"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formWorkout.durationMinutes}
                      onChange={e => setFormWorkout({...formWorkout, durationMinutes: Number(e.target.value)})}
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume (km)</label>
                    <input
                      type="number"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formWorkout.distanceKm}
                      onChange={e => setFormWorkout({...formWorkout, distanceKm: Number(e.target.value)})}
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PSE Estimada</label>
                    <input
                      type="number"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic text-center focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-600"
                      min="1" max="10"
                      value={formWorkout.rpe}
                      onChange={e => setFormWorkout({...formWorkout, rpe: Number(e.target.value)})}
                    />
                 </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estrutura e Prescrição Detalhada</label>
              <textarea 
                placeholder="Descreva o aquecimento, parte principal e desaquecimento..."
                className="w-full flex-1 p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm italic focus:ring-2 focus:ring-emerald-500 outline-none resize-none min-h-[200px]"
                value={formWorkout.description}
                onChange={e => setFormWorkout({...formWorkout, description: e.target.value})}
              />
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase mt-3 italic">
                <Info className="w-3 h-3 text-emerald-500" />
                <span>Instruções técnicas para o atleta visualizar no portal.</span>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 mt-4 border-t border-slate-50 pt-8">
               <button 
                type="button"
                disabled={isSaving}
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-slate-400 font-black text-xs uppercase italic tracking-widest hover:text-slate-600 transition disabled:opacity-50"
               >
                 CANCELAR
               </button>
               <button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50"
               >
                 {isSaving ? (
                   <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    SINCRONIZANDO...
                   </span>
                 ) : (
                   <span className="flex items-center gap-2">
                    {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'ATUALIZAR TREINO' : 'SALVAR NA BIBLIOTECA'}
                   </span>
                 )}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {workouts.map(w => (
          <div key={w.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative border-b-8">
            <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-[2rem]
               ${w.type === 'Recovery' ? 'bg-blue-400' :
                 w.type === 'Tempo' ? 'bg-yellow-400' :
                 w.type === 'Interval' ? 'bg-orange-400' :
                 w.type === 'Long Run' ? 'bg-emerald-400' :
                 w.type === 'Prova' ? 'bg-purple-600' :
                 'bg-red-400'}`}></div>

            <div className="flex justify-between items-start mb-4 mt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                {mapType(w.type)}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleEdit(w)} className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition shadow-sm border border-slate-100">
                    <Edit2 className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={(e) => confirmDelete(e, w.id, w.title)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition shadow-sm border border-slate-100">
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>

            <h3 className="font-black text-slate-900 text-lg mb-3 uppercase italic tracking-tighter leading-tight">{w.title}</h3>
            <p className="text-slate-500 text-xs font-medium italic mb-6 line-clamp-3 leading-relaxed">"{w.description}"</p>

            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span className="text-[10px] font-black text-slate-600 italic">{w.durationMinutes}M</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Book className="w-3 h-3 text-slate-300" />
                  <span className="text-[10px] font-black text-slate-600 italic">{w.distanceKm}K</span>
                </div>
              </div>
              <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                 <span className="text-[9px] font-black text-emerald-600 uppercase italic">PSE {w.rpe}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Internal icon for select
const ChevronDown = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

export default Library;
