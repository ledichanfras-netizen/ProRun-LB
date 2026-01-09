
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Athlete, ExperienceLevel } from '../types';
import { Plus, Search, Trash2, Edit2, CheckCircle, X, AlertTriangle, Calendar, UserPlus, TrendingUp, Award, Info } from 'lucide-react';

const Athletes: React.FC = () => {
  const { athletes, addAthlete, updateAthlete, deleteAthlete, setSelectedAthleteId, selectedAthleteId, generateTestAthletes } = useApp();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLevelGuide, setShowLevelGuide] = useState(false);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });

  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Iniciante', email: ''
  });

  // Filter Athletes
  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate age from birthDate if provided
    let calculatedAge = formData.age;
    if (formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      calculatedAge = age;
    }

    const dataToSave = { ...formData, age: calculatedAge };

    if (editingId) {
      updateAthlete(editingId, dataToSave);
    } else {
      if (dataToSave.name) {
        addAthlete({
          ...dataToSave as Athlete,
          id: crypto.randomUUID(),
          metrics: { vdot: 30, test3kTime: '00:00' },
          assessmentHistory: []
        });
      }
    }
    
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Iniciante', email: '' });
  };

  const handleEditClick = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setFormData(athlete);
    setIsFormOpen(true);
  };

  const confirmDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (deleteModal.id) {
      await deleteAthlete(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  return (
    <div className="space-y-6 relative animate-fade-in">
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-fade-in-up border-l-8 border-red-500">
             <div className="flex items-center gap-4 text-red-600 mb-6">
               <div className="bg-red-50 p-3 rounded-2xl"><AlertTriangle className="w-8 h-8" /></div>
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Excluir Atleta?</h3>
             </div>
             <p className="text-slate-600 mb-2 font-medium italic">Você está prestes a remover permanentemente:</p>
             <p className="font-black text-xl text-slate-800 mb-8 uppercase italic tracking-tighter">{deleteModal.name}</p>
             <div className="flex gap-4 justify-end">
               <button onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })} className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:text-slate-600 tracking-widest italic">CANCELAR</button>
               <button onClick={executeDelete} className="px-8 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black text-xs uppercase shadow-xl tracking-widest italic flex items-center gap-2">
                 <Trash2 className="w-4 h-4" /> CONFIRMAR EXCLUSÃO
               </button>
             </div>
          </div>
        </div>
      )}

      {showLevelGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-950/80 backdrop-blur-md p-4" onClick={() => setShowLevelGuide(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-lg w-full animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
                <Info className="text-emerald-500" /> Guia de Níveis Técnicos
              </h3>
              <button onClick={() => setShowLevelGuide(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-full transition"><X /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border-l-4 border-slate-300">
                <p className="font-black text-xs uppercase text-slate-900 mb-1">Iniciante</p>
                <p className="text-xs text-slate-600">Começou a correr recentemente ou corre de forma irregular. Foco em adaptação e constância.</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                <p className="font-black text-xs uppercase text-emerald-700 mb-1">Intermediário</p>
                <p className="text-xs text-slate-600">Corre há mais de 6 meses, já completou provas de 5k ou 10k. Busca melhorar tempos.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
                <p className="font-black text-xs uppercase text-blue-700 mb-1">Avançado</p>
                <p className="text-xs text-slate-600">Treina com volume consistente, foca em performance e provas de longa distância (21k/42k).</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border-l-4 border-purple-500">
                <p className="font-black text-xs uppercase text-purple-700 mb-1">Elite</p>
                <p className="text-xs text-slate-600">Alta performance, treinos diários ou bi-diários, busca pódios e índices oficiais.</p>
              </div>
            </div>
            <button onClick={() => setShowLevelGuide(false)} className="w-full mt-6 bg-emerald-950 text-white py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl">ENTENDI</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Gestão de Elenco</h1>
          <p className="text-slate-500 font-medium">Controle biométrico e acesso dos atletas.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={generateTestAthletes}
            className="flex-1 md:flex-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase italic tracking-widest transition shadow-sm border border-emerald-200"
          >
            <UserPlus className="w-4 h-4" /> GERAR TESTES
          </button>
          <button 
            onClick={() => {
              setIsFormOpen(true);
              setEditingId(null);
              setFormData({ name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Iniciante', email: '' });
            }}
            className="flex-1 md:flex-none bg-emerald-950 hover:bg-black text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase italic tracking-widest shadow-xl transition"
          >
            <Plus className="w-4 h-4" /> NOVO ATLETA
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
        <input 
          type="text" 
          placeholder="PESQUISAR POR NOME OU EMAIL..." 
          className="w-full pl-12 pr-4 py-5 rounded-[1.5rem] border-none bg-white shadow-xl shadow-slate-200/50 focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm tracking-tight italic"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 animate-fade-in-up">
          <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
              {editingId ? 'Editar Cadastro' : 'Novo Recrutamento'}
            </h2>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-full transition">
               <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
              <input 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Ex: João das Neves" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Profissional</label>
              <input 
                type="email"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="atleta@pro.com" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Nascimento (Senha)
              </label>
              <input 
                type="date"
                className="w-full p-4 bg-emerald-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none" 
                value={formData.birthDate || ''}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                required
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1"><Award className="w-3 h-3" /> Nível Técnico</span>
                <button type="button" onClick={() => setShowLevelGuide(true)} className="text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1">
                   <Info className="w-3 h-3" /> <span className="text-[8px]">IDENTIFICAR</span>
                </button>
              </label>
              <select 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" 
                value={formData.experience}
                onChange={e => setFormData({...formData, experience: e.target.value as ExperienceLevel})}
                required
              >
                <option value="Iniciante">Iniciante</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
                <option value="Elite">Elite</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Peso (kg)</label>
              <input 
                type="number"
                step="0.1"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="00.0" 
                value={formData.weight || ''}
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Altura (cm)</label>
               <input 
                type="number"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="000" 
                value={formData.height || ''}
                onChange={e => setFormData({...formData, height: Number(e.target.value)})}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-4 mt-6">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest italic hover:text-slate-600 transition">CANCELAR</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105">
                {editingId ? '✓ ATUALIZAR DADOS' : '✓ SALVAR ATLETA'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-6">Identificação</th>
                <th className="p-6">Nível Técnico</th>
                <th className="p-6">Biometria</th>
                <th className="p-6">VDOT (Pro)</th>
                <th className="p-6 text-center">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAthletes.map((athlete) => (
                <tr key={athlete.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedAthleteId === athlete.id ? 'bg-emerald-50/50' : ''}`}>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center text-white font-black italic text-sm">
                          {athlete.name.charAt(0)}
                       </div>
                       <div>
                          <div className="font-black text-slate-900 uppercase italic tracking-tighter">{athlete.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold lowercase">{athlete.email}</div>
                       </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`
                      px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest border
                      ${athlete.experience === 'Elite' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        athlete.experience === 'Avançado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        athlete.experience === 'Intermediário' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        'bg-slate-50 text-slate-700 border-slate-200'}
                    `}>
                      {athlete.experience}
                    </span>
                  </td>
                  <td className="p-6 text-[11px] font-black text-slate-500 uppercase italic">
                    {athlete.age} anos • {athlete.weight}kg • {athlete.height}cm
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-emerald-600 italic tracking-tighter">{athlete.metrics.vdot}</span>
                       <TrendingUp className="w-3 h-3 text-emerald-400" />
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => setSelectedAthleteId(athlete.id)}
                        className={`p-3 rounded-xl transition shadow-sm ${selectedAthleteId === athlete.id ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100'}`} 
                        title="Selecionar para Trabalho"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleEditClick(athlete)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-white bg-slate-50 rounded-xl transition" title="Editar Perfil">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={(e) => confirmDelete(e, athlete.id, athlete.name)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-white bg-slate-50 rounded-xl transition" title="Remover do Elenco">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAthletes.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-black uppercase text-xs italic tracking-widest">
               Nenhum registro encontrado no elenco.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Athletes;
