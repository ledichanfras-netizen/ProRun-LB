
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Athlete, ExperienceLevel } from '../types';
import { Plus, Search, Trash2, Edit2, CheckCircle, X, AlertTriangle, Calendar } from 'lucide-react';

const Athletes: React.FC = () => {
  const { athletes, addAthlete, updateAthlete, deleteAthlete, setSelectedAthleteId, selectedAthleteId } = useApp();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });

  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Beginner', email: ''
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
      // Edit Mode
      updateAthlete(editingId, dataToSave);
    } else {
      // Create Mode
      if (dataToSave.name) {
        addAthlete({
          ...dataToSave as Athlete,
          id: crypto.randomUUID(),
          metrics: { vdot: 30, test3kTime: '00:00' } // Defaults
        });
      }
    }
    
    // Reset
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Beginner', email: '' });
  };

  const handleEditClick = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setFormData(athlete);
    setIsFormOpen(true);
  };

  // Open Delete Modal
  const confirmDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, name });
  };

  // Execute Delete
  const executeDelete = async () => {
    if (deleteModal.id) {
      await deleteAthlete(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const mapExperience = (level: string) => {
    switch (level) {
      case 'Beginner': return 'Iniciante';
      case 'Intermediate': return 'Intermediário';
      case 'Advanced': return 'Avançado';
      case 'Elite': return 'Elite';
      default: return level;
    }
  }

  return (
    <div className="space-y-6 relative">
      
      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up border-l-4 border-red-500">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertTriangle className="w-8 h-8" />
               <h3 className="text-xl font-bold">Excluir Atleta?</h3>
             </div>
             <p className="text-slate-600 mb-2">
               Você está prestes a excluir: 
             </p>
             <p className="font-bold text-lg text-slate-800 mb-4">{deleteModal.name}</p>
             <p className="text-xs text-red-500 bg-red-50 p-3 rounded mb-6">
               Esta ação é irreversível! Todo o histórico de avaliações e planos de treinamento serão perdidos permanentemente.
             </p>
             <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
               >
                 Cancelar
               </button>
               <button 
                 onClick={executeDelete}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md flex items-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Confirmar Exclusão
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Atletas</h1>
          <p className="text-slate-500">Gerencie sua equipe e biometria</p>
        </div>
        <button 
          onClick={() => {
            setIsFormOpen(true);
            setEditingId(null);
            setFormData({ name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Beginner', email: '' });
          }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Adicionar Atleta
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Pesquisar atleta por nome..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-fade-in-down">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{editingId ? 'Editar Atleta' : 'Cadastro de Novo Atleta'}</h2>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
              <input 
                className="w-full p-2 border rounded" 
                placeholder="Nome Completo" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input 
                type="email"
                className="w-full p-2 border rounded" 
                placeholder="Email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            {/* DATE OF BIRTH FIELD (Used as Password) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Nascimento
              </label>
              <input 
                type="date"
                className="w-full p-2 border rounded border-blue-200 bg-blue-50" 
                value={formData.birthDate || ''}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                required
              />
              <p className="text-[10px] text-blue-600 mt-1">Usada como senha de acesso (DDMMAAAA)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
              <input 
                type="number"
                className="w-full p-2 border rounded" 
                placeholder="Peso (kg)" 
                value={formData.weight || ''}
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Altura (cm)</label>
               <input 
                type="number"
                className="w-full p-2 border rounded" 
                placeholder="Altura (cm)" 
                value={formData.height || ''}
                onChange={e => setFormData({...formData, height: Number(e.target.value)})}
              />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nível</label>
               <select 
                className="w-full p-2 border rounded"
                value={formData.experience}
                onChange={e => setFormData({...formData, experience: e.target.value as ExperienceLevel})}
              >
                <option value="Beginner">Iniciante</option>
                <option value="Intermediate">Intermediário</option>
                <option value="Advanced">Avançado</option>
                <option value="Elite">Elite</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
              >
                {editingId ? 'Atualizar Atleta' : 'Salvar Atleta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Athlete Table with Horizontal Scroll for Mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Nome</th>
                <th className="p-4 font-semibold">Nível</th>
                <th className="p-4 font-semibold">Métricas</th>
                <th className="p-4 font-semibold">VO2</th>
                <th className="p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAthletes.map((athlete) => (
                <tr key={athlete.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${selectedAthleteId === athlete.id ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{athlete.name}</div>
                    <div className="text-xs text-slate-500">{athlete.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${athlete.experience === 'Elite' ? 'bg-purple-100 text-purple-700' : 
                        athlete.experience === 'Advanced' ? 'bg-blue-100 text-blue-700' : 
                        athlete.experience === 'Intermediate' ? 'bg-green-100 text-green-700' : 
                        'bg-slate-100 text-slate-700'}
                    `}>
                      {mapExperience(athlete.experience)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {athlete.age} anos • {athlete.weight}kg
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    {athlete.metrics.vdot}
                  </td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => setSelectedAthleteId(athlete.id)}
                      className={`p-2 rounded transition ${selectedAthleteId === athlete.id ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`} 
                      title={selectedAthleteId === athlete.id ? "Selecionado" : "Selecionar"}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(athlete)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => confirmDelete(e, athlete.id, athlete.name)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAthletes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum atleta encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Athletes;
