import os

athletes_content = """import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Athlete, ExperienceLevel } from '../types';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  X,
  AlertTriangle,
  Calendar,
  UserPlus,
  TrendingUp,
  Award,
  Info,
  ChevronDown
} from 'lucide-react';
import { withTimeout } from '../utils/helpers';

const Athletes: React.FC = () => {
  const { athletes, addAthlete, updateAthlete, deleteAthlete, setSelectedAthleteId, selectedAthleteId } = useApp();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLevelGuide, setShowLevelGuide] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null, name: string}>({
    isOpen: false,
    id: null,
    name: ''
  });

  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: '',
    age: 0,
    birthDate: '',
    weight: 0,
    height: 0,
    experience: 'Iniciante',
    email: ''
  });

  const filteredAthletes = athletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let calculatedAge = formData.age || 0;
      if (formData.birthDate) {
        const today = new Date();
        const birth = new Date(formData.birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        calculatedAge = age;
      }

      const dataToSave = { ...formData, age: calculatedAge };

      if (editingId) {
        await withTimeout(updateAthlete(editingId, dataToSave));
      } else {
        if (dataToSave.name) {
          await withTimeout(addAthlete({
            ...dataToSave as Athlete,
            id: crypto.randomUUID(),
            metrics: { vdot: 30, test3kTime: '00:00' },
            assessmentHistory: [],
            customZones: []
          }));
        }
      }

      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', age: 0, birthDate: '', weight: 0, height: 0, experience: 'Iniciante', email: '' });
    } catch (error) {
      console.error("Erro ao salvar atleta:", error);
    } finally {
      setIsSaving(false);
    }
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
      try {
        await withTimeout(deleteAthlete(deleteModal.id));
        setDeleteModal({ isOpen: false, id: null, name: '' });
      } catch (error) {
        console.error("Erro ao excluir atleta:", error);
      }
    }
  };

  const handleLevelChange = async (athleteId: string, level: ExperienceLevel) => {
    try {
      await withTimeout(updateAthlete(athleteId, { experience: level }));
    } catch (error) {
      console.error("Erro ao alterar nível:", error);
    }
  };

  return (
    <div className=\"space-y-6 relative animate-fade-in custom-scrollbar\">
      {deleteModal.isOpen && (
        <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4\">
          <div className=\"bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-fade-in-up border-l-8 border-red-500\">
             <div className=\"flex items-center gap-4 text-red-600 mb-6\">
               <div className=\"bg-red-50 p-3 rounded-2xl\"><AlertTriangle className=\"w-8 h-8\" /></div>
               <h3 className=\"text-2xl font-black uppercase italic tracking-tighter\">Excluir Atleta?</h3>
             </div>
             <p className=\"text-slate-600 mb-2 font-medium italic\">Você está prestes a remover permanentemente:</p>
             <p className=\"font-black text-xl text-slate-800 mb-8 uppercase italic tracking-tighter\">{deleteModal.name}</p>
             <div className=\"flex gap-4 justify-end\">
               <button onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })} className=\"px-6 py-3 text-slate-400 font-black text-xs uppercase hover:text-slate-600 tracking-widest italic\">CANCELAR</button>
               <button onClick={executeDelete} className=\"px-8 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black text-xs uppercase shadow-xl tracking-widest italic flex items-center gap-2\">
                 <Trash2 className=\"w-4 h-4\" /> CONFIRMAR EXCLUSÃO
               </button>
             </div>
          </div>
        </div>
      )}

      {showLevelGuide && (
        <div className=\"fixed inset-0 z-[60] flex items-center justify-center bg-emerald-950/80 backdrop-blur-md p-4\" onClick={() => setShowLevelGuide(false)}>
          <div className=\"bg-white rounded-[2rem] shadow-2xl p-8 max-w-lg w-full animate-fade-in-up\" onClick={e => e.stopPropagation()}>
            <div className=\"flex justify-between items-center mb-6\">
              <h3 className=\"text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2\">
                <Info className=\"text-emerald-50\" /> Guia de Níveis Técnicos
              </h3>
              <button onClick={() => setShowLevelGuide(false)} className=\"text-slate-400 hover:bg-slate-50 p-2 rounded-full transition\"><X /></button>
            </div>
            <div className=\"space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar\">
              <div className=\"p-4 bg-slate-50 rounded-2xl border-l-4 border-slate-300\">
                <p className=\"font-black text-xs uppercase text-slate-900 mb-1\">Iniciante</p>
                <p className=\"text-xs text-slate-600\">Começou a correr recentemente ou corre de forma irregular. Foco em adaptação e constância.</p>
              </div>
              <div className=\"p-4 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500\">
                <p className=\"font-black text-xs uppercase text-emerald-700 mb-1\">Intermediário</p>
                <p className=\"text-xs text-slate-600\">Corre há mais de 6 meses, já completou provas de 5k ou 10k. Busca melhorar tempos.</p>
              </div>
              <div className=\"p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500\">
                <p className=\"font-black text-xs uppercase text-blue-700 mb-1\">Avançado</p>
                <p className=\"text-xs text-slate-600\">Treina com volume consistente, foca em performance e provas de longa distância (21k/42k).</p>
              </div>
              <div className=\"p-4 bg-purple-50 rounded-2xl border-l-4 border-purple-500\">
                <p className=\"font-black text-xs uppercase text-purple-700 mb-1\">Elite</p>
                <p className=\"text-xs text-slate-600\">Alta performance, treinos diários ou bi-diários, busca pódios e índices oficiais.</p>
              </div>
            </div>
            <button onClick={() => setShowLevelGuide(false)} className=\"w-full mt-6 bg-emerald-950 text-white py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl\">ENTENDI</button>
          </div>
        </div>
      )}

      <div className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100\">
        <div>
          <h2 className=\"text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3\">
            <Users className=\"text-emerald-600 w-8 h-8\" /> Gestão do Elenco
          </h2>
          <p className=\"text-slate-500 mt-1 font-medium italic\">Administração de atletas e prontidão técnica.</p>
        </div>
        <div className=\"flex w-full md:w-auto gap-3\">
          <div className=\"relative flex-1 md:w-64\">
            <Search className=\"absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4\" />
            <input
              type=\"text\"
              placeholder=\"Buscar por nome...\"
              className=\"w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black uppercase italic focus:ring-2 focus:ring-emerald-500 outline-none\"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingId(null); setFormData({ name: \"\", experience: \"Iniciante\", birthDate: \"\", email: \"\", weight: 0, height: 0 }); setIsFormOpen(true); }}
            className=\"bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2\"
          >
            <UserPlus className=\"w-4 h-4\" /> Novo Atleta
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className=\"bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-emerald-100 animate-fade-in-up\">
          <div className=\"flex justify-between items-center mb-8\">
             <h3 className=\"text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2\">
                {editingId ? <Edit2 className=\"text-emerald-600\" /> : <Plus className=\"text-emerald-600\" />}
                {editingId ? 'Editar Perfil' : 'Cadastrar Novo Atleta'}
             </h3>
             <button onClick={() => setIsFormOpen(false)} className=\"p-2 hover:bg-slate-50 rounded-full transition text-slate-400\"><X /></button>
          </div>

          <form onSubmit={handleSubmit} className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
            <div className=\"md:col-span-2\">
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2\">Nome Completo</label>
              <input
                type=\"text\"
                className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none\"
                placeholder=\"Ex: Leandro Barbosa\"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2\">Email de Contato</label>
              <input
                type=\"email\"
                className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none\"
                placeholder=\"atleta@email.com\"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1\">
                <Calendar className=\"w-3 h-3\" /> Data Nascimento (Senha)
              </label>
              <input
                type=\"date\"
                className=\"w-full p-4 bg-emerald-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none\"
                value={formData.birthDate || ''}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                required
              />
            </div>

            <div className=\"relative\">
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between\">
                <span className=\"flex items-center gap-1\"><Award className=\"w-3 h-3\" /> Nível Técnico</span>
                <button type=\"button\" onClick={() => setShowLevelGuide(true)} className=\"text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1\">
                   <Info className=\"w-3 h-3\" /> <span className=\"text-[8px]\">IDENTIFICAR</span>
                </button>
              </label>
              <div className=\"relative\">
                <select
                    className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none appearance-none\"
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: e.target.value as ExperienceLevel})}
                    required
                >
                    <option value=\"Iniciante\">Iniciante</option>
                    <option value=\"Intermediário\">Intermediário</option>
                    <option value=\"Avançado\">Avançado</option>
                    <option value=\"Elite\">Elite</option>
                </select>
                <ChevronDown className=\"absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none\" />
              </div>
            </div>

            <div>
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2\">Peso (kg)</label>
              <input
                type=\"number\"
                step=\"0.1\"
                className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none\"
                placeholder=\"00.0\"
                value={formData.weight || ''}
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2\">Altura (cm)</label>
               <input
                type=\"number\"
                className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black italic focus:ring-2 focus:ring-emerald-500 outline-none\"
                placeholder=\"000\"
                value={formData.height || ''}
                onChange={e => setFormData({...formData, height: Number(e.target.value)})}
              />
            </div>
            <div className=\"md:col-span-3 flex justify-end gap-4 mt-6\">
              <button
                type=\"button\"
                onClick={() => setIsFormOpen(false)}
                className=\"px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest italic hover:text-slate-600 transition\"
                disabled={isSaving}
              >
                CANCELAR
              </button>
              <button
                type=\"submit\"
                disabled={isSaving}
                className=\"bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100\"
              >
                {isSaving ? (
                  <span className=\"flex items-center gap-2\">
                    <div className=\"w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin\"></div>
                    SALVANDO...
                  </span>
                ) : (
                  editingId ? '✓ ATUALIZAR DADOS' : '✓ SALVAR ATLETA'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className=\"bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden\">
        <div className=\"overflow-x-auto custom-scrollbar\">
          <table className=\"w-full text-left border-collapse min-w-[800px]\">
            <thead>
              <tr className=\"bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100\">
                <th className=\"p-6\">Identificação</th>
                <th className=\"p-6\">Nível Técnico (Trocar)</th>
                <th className=\"p-6\">Biometria</th>
                <th className=\"p-6\">VDOT (Pro)</th>
                <th className=\"p-6 text-center\">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className=\"divide-y divide-slate-50\">
              {filteredAthletes.map((athlete) => (
                <tr key={athlete.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedAthleteId === athlete.id ? 'bg-emerald-50/50' : ''}`}>
                  <td className=\"p-6\">
                    <div className=\"flex items-center gap-4\">
                       <div className=\"w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center text-white font-black italic text-sm\">
                          {athlete.name.charAt(0)}
                       </div>
                       <div>
                          <div className=\"font-black text-slate-900 uppercase italic tracking-tighter\">{athlete.name}</div>
                          <div className=\"text-[10px] text-slate-400 font-bold lowercase\">{athlete.email}</div>
                       </div>
                    </div>
                  </td>
                  <td className=\"p-6\">
                    <div className=\"relative flex items-center max-w-[160px]\">
                      <select
                        className={`
                          appearance-none w-full px-4 py-2 pr-8 rounded-xl text-[10px] font-black uppercase italic tracking-widest border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm
                          ${athlete.experience === 'Elite' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                            athlete.experience === 'Avançado' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            athlete.experience === 'Intermediário' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            'bg-slate-50 text-slate-700 border-slate-300'}
                        `}
                        value={athlete.experience}
                        onChange={(e) => handleLevelChange(athlete.id, e.target.value as ExperienceLevel)}
                      >
                        <option value=\"Iniciante\">Iniciante</option>
                        <option value=\"Intermediário\">Intermediário</option>
                        <option value=\"Avançado\">Avançado</option>
                        <option value=\"Elite\">Elite</option>
                      </select>
                      <ChevronDown className=\"w-3 h-3 absolute right-3 pointer-events-none opacity-60 text-slate-900\" />
                    </div>
                  </td>
                  <td className=\"p-6 text-[11px] font-black text-slate-500 uppercase italic\">
                    {athlete.age} anos • {athlete.weight}kg • {athlete.height}cm
                  </td>
                  <td className=\"p-6\">
                    <div className=\"flex items-center gap-2\">
                       <span className=\"text-xl font-black text-emerald-600 italic tracking-tighter\">{athlete.metrics.vdot}</span>
                       <TrendingUp className=\"w-3 h-3 text-emerald-400\" />
                    </div>
                  </td>
                  <td className=\"p-6\">
                    <div className=\"flex justify-center gap-3\">
                      <button
                        onClick={() => setSelectedAthleteId(athlete.id)}
                        className={`p-3 rounded-xl transition shadow-sm ${selectedAthleteId === athlete.id ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100'}`}
                        title=\"Selecionar para Trabalho\"
                      >
                        <CheckCircle className=\"w-5 h-5\" />
                      </button>
                      <button onClick={() => handleEditClick(athlete)} className=\"p-3 text-slate-400 hover:text-emerald-600 hover:bg-white bg-slate-50 rounded-xl transition\" title=\"Editar Perfil\">
                        <Edit2 className=\"w-5 h-5\" />
                      </button>
                      <button onClick={(e) => confirmDelete(e, athlete.id, athlete.name)} className=\"p-3 text-slate-400 hover:text-red-600 hover:bg-white bg-slate-50 rounded-xl transition\" title=\"Remover do Elenco\">
                        <Trash2 className=\"w-5 h-5\" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAthletes.length === 0 && (
            <div className=\"py-20 text-center text-slate-400 font-black uppercase text-xs italic tracking-widest\">
               Nenhum registro encontrado no elenco.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Athletes;
\"\"\"

assessments_content = \"\"\"import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Assessment, TrainingZone, Athlete } from '../types';
import {
  Plus,
  Activity,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Heart,
  History,
  Loader2,
  X,
  TrendingUp,
  Info,
  Users
} from 'lucide-react';
import { calculateVO2, calculatePaces, getHrRangeString } from '../utils/calculations';
import { withTimeout } from '../utils/helpers';

const Assessments: React.FC = () => {
  const { athletes, selectedAthleteId, addNewAssessment, updateAssessment, deleteAssessment, updateAthlete } = useApp();
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [isSavingZones, setIsSavingZones] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingZones, setIsEditingZones] = useState(false);

  // Form states
  const [testType, setTestType] = useState<'3k' | 'TRF' | 'VO2_Lab'>('3k');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime3k, setFormTime3k] = useState('');
  const [formTrfDistance, setFormTrfDistance] = useState(0);
  const [formTrfTime, setFormTrfTime] = useState('');
  const [formVo2Max, setFormVo2Max] = useState(0);
  const [formFcMax, setFormFcMax] = useState<number | ''>('');
  const [formFcThreshold, setFormFcThreshold] = useState<number | ''>('');
  const [calculatedVo2, setCalculatedVo2] = useState<number | null>(null);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const isReadOnly = !activeAthlete;

  const handleSimulate3k = (time: string) => {
    if (time.includes(':') && time.length >= 4) {
      const vdot = calculateVO2(time, 3);
      setCalculatedVo2(vdot);
    }
  };

  const handleSimulateTrf = (time: string) => {
    if (time.includes(':') && time.length >= 4 && formTrfDistance > 0) {
      const vdot = calculateVO2(time, formTrfDistance);
      setCalculatedVo2(vdot);
    }
  };

  const handleSaveAssessment = async () => {
    if (!activeAthlete || !calculatedVo2) return;
    setIsSavingAssessment(true);

    const assessment: Assessment = {
      id: editingId || crypto.randomUUID(),
      date: formDate,
      type: testType === '3k' ? 'Teste 3km' : testType === 'TRF' ? `TRF ${formTrfDistance}km` : 'VO2 Lab',
      resultValue: testType === '3k' ? formTime3k : testType === 'TRF' ? `${formTrfDistance}k em ${formTrfTime}` : `${formVo2Max} ml/kg`,
      calculatedVdot: calculatedVo2,
      fcMax: formFcMax || undefined,
      fcThreshold: formFcThreshold || undefined
    };

    try {
      if (editingId) {
        await withTimeout(updateAssessment(activeAthlete.id, assessment));
      } else {
        await withTimeout(addNewAssessment(activeAthlete.id, assessment));
      }

      // Limpar formulário
      setEditingId(null);
      setFormTime3k('');
      setFormTrfTime('');
      setCalculatedVo2(null);
      setFormFcMax('');
      setFormFcThreshold('');
    } catch (error) {
      console.error(\"Erro ao salvar avaliação:\", error);
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleEditHistory = (ass: Assessment) => {
    setEditingId(ass.id);
    setFormDate(ass.date);
    setCalculatedVo2(ass.calculatedVdot);
    setFormFcMax(ass.fcMax || '');
    setFormFcThreshold(ass.fcThreshold || '');

    if (ass.type.includes('3km')) {
      setTestType('3k');
      setFormTime3k(ass.resultValue);
    } else if (ass.type.includes('TRF')) {
      setTestType('TRF');
      const parts = ass.resultValue.split(' em ');
      setFormTrfDistance(parseFloat(parts[0]));
      setFormTrfTime(parts[1]);
    } else {
      setTestType('VO2_Lab');
      setFormVo2Max(parseFloat(ass.resultValue));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(\"Deseja realmente excluir este registro do histórico?\")) {
      try {
        await withTimeout(deleteAssessment(activeAthlete!.id, id));
      } catch (error) {
        console.error(\"Erro ao deletar:\", error);
      }
    }
  };

  // Paces logic
  const vdotValue = activeAthlete?.metrics.vdot || 30;
  const currentPaces = activeAthlete?.customZones && activeAthlete.customZones.length > 0
    ? activeAthlete.customZones
    : calculatePaces(vdotValue, activeAthlete?.metrics.fcThreshold, activeAthlete?.metrics.fcMax);

  const [editablePaces, setEditablePaces] = useState<TrainingZone[]>([]);

  const handleStartZoneEdit = () => {
    setEditablePaces(currentPaces.map(p => ({...p})));
    setIsEditingZones(true);
  };

  const handleZoneChange = (index: number, field: keyof TrainingZone, value: string) => {
    const newPaces = [...editablePaces];
    newPaces[index] = { ...newPaces[index], [field]: value };
    setEditablePaces(newPaces);
  };

  const handleSaveZones = async () => {
    if (!activeAthlete) return;
    setIsSavingZones(true);
    try {
      await withTimeout(updateAthlete(activeAthlete.id, { customZones: editablePaces }));
      setIsEditingZones(false);
    } catch (error) {
      console.error(\"Erro ao salvar zonas customizadas:\", error);
    } finally {
      setIsSavingZones(false);
    }
  };

  const handleResetZones = () => {
    if (window.confirm(\"Deseja restaurar as zonas padrão para este VDOT?\")) {
      setEditablePaces(calculatePaces(vdotValue, activeAthlete?.metrics.fcThreshold, activeAthlete?.metrics.fcMax));
    }
  };

  const handleRecalculateZones = () => {
    setEditablePaces(calculatePaces(vdotValue, activeAthlete?.metrics.fcThreshold, activeAthlete?.metrics.fcMax));
  };

  if (!activeAthlete) {
    return (
      <div className=\"flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 text-center px-6\">
        <div className=\"bg-emerald-50 p-6 rounded-full mb-6\">
          <Users className=\"w-12 h-12 text-emerald-600\" />
        </div>
        <h2 className=\"text-2xl font-black text-slate-900 uppercase italic tracking-tighter\">Nenhum Atleta Selecionado</h2>
        <p className=\"text-slate-500 mt-2 font-medium italic max-w-sm\">
          Selecione um atleta na aba \"Meus Atletas\" para gerenciar suas avaliações e zonas.
        </p>
      </div>
    );
  }

  return (
    <div className=\"space-y-8 animate-fade-in pb-10\">
      <header className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100\">
        <div>
          <div className=\"flex items-center gap-2 mb-1\">
             <span className=\"text-[10px] font-black text-emerald-600 uppercase tracking-widest italic bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100\">Performance Integrada</span>
          </div>
          <h1 className=\"text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3\">
            <Activity className=\"text-emerald-600 w-8 h-8\" /> Avaliações: {activeAthlete.name}
          </h1>
          <p className=\"text-slate-500 mt-1 font-medium italic\">Gestão de testes fisiológicos e zonas de intensidade.</p>
        </div>

        <div className=\"flex flex-col items-end\">
           <span className=\"text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1\">VDOT Atual</span>
           <div className=\"flex items-center gap-2 bg-emerald-950 px-6 py-3 rounded-2xl shadow-xl shadow-emerald-900/20\">
              <TrendingUp className=\"w-4 h-4 text-emerald-400\" />
              <span className=\"text-2xl font-black text-white italic tracking-tighter\">{activeAthlete.metrics.vdot}</span>
           </div>
        </div>
      </header>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">
          <div className=\"space-y-6\">
            <div className=\"bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100\">
              <div className=\"flex items-center gap-3 mb-8 border-b border-slate-50 pb-4\">
                <div className=\"bg-emerald-50 p-3 rounded-2xl\"><Plus className=\"w-5 h-5 text-emerald-600\" /></div>
                <h2 className=\"text-xl font-black text-slate-900 uppercase italic tracking-tighter\">{editingId ? 'Editar Teste' : 'Novo Registro'}</h2>
              </div>

              <div className=\"space-y-6\">
                <div>
                  <label className=\"block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2\">Protocolo de Teste</label>
                  <div className=\"grid grid-cols-3 gap-2\">
                    <button onClick={() => setTestType('3k')} className={`py-3 px-1 rounded-xl font-black text-[9px] uppercase italic transition-all border ${testType === '3k' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Teste 3km</button>
                    <button onClick={() => setTestType('TRF')} className={`py-3 px-1 rounded-xl font-black text-[9px] uppercase italic transition-all border ${testType === 'TRF' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>T.R.F</button>
                    <button onClick={() => setTestType('VO2_Lab')} className={`py-3 px-1 rounded-xl font-black text-[9px] uppercase italic transition-all border ${testType === 'VO2_Lab' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>VO2 Lab</button>
                  </div>
                </div>

                <div>
                  <label className=\"block text-[10px] font-black text-slate-400 uppercase mb-1\">Data</label>
                  <input type=\"date\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold disabled:opacity-50 focus:ring-2 focus:ring-emerald-500 outline-none\" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>

                {testType === '3k' && (
                  <div className=\"animate-fade-in\">
                    <label className=\"block text-[10px] font-black text-slate-400 uppercase mb-1\">Tempo 3km (MM:SS)</label>
                    <input type=\"text\" placeholder=\"Ex: 12:30\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic focus:ring-2 focus:ring-emerald-500 outline-none\" value={formTime3k} onChange={(e) => { setFormTime3k(e.target.value); if (e.target.value.length >= 4) handleSimulate3k(e.target.value); }} />
                  </div>
                )}

                {testType === 'TRF' && (
                  <div className=\"space-y-3 animate-fade-in\">
                    <div>
                      <label className=\"block text-[10px] font-black text-slate-400 uppercase mb-1\">Distância (km)</label>
                      <input type=\"number\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none\" value={formTrfDistance} onChange={(e) => setFormTrfDistance(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className=\"block text-[10px] font-black text-slate-400 uppercase mb-1\">Tempo Total (MM:SS)</label>
                      <input type=\"text\" placeholder=\"Ex: 22:15\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic focus:ring-2 focus:ring-emerald-500 outline-none\" value={formTrfTime} onChange={(e) => { setFormTrfTime(e.target.value); if (e.target.value.length >= 4) handleSimulateTrf(e.target.value); }} />
                    </div>
                  </div>
                )}

                {testType === 'VO2_Lab' && (
                  <div className=\"animate-fade-in\">
                    <label className=\"block text-[10px] font-black text-slate-400 uppercase mb-1\">VO2Max (ml/kg/min)</label>
                    <input type=\"number\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic focus:ring-2 focus:ring-emerald-500 outline-none\" value={formVo2Max} onChange={(e) => setFormVo2Max(Number(e.target.value))} />
                  </div>
                )}

                <div className=\"pt-4 border-t border-slate-50\">
                  <h3 className=\"text-[9px] font-black uppercase text-emerald-600 mb-3 flex items-center gap-1 italic\"><Heart className=\"w-3 h-3\" /> Frequência Cardíaca</h3>
                  <div className=\"grid grid-cols-2 gap-3\">
                    <div>
                      <label className=\"block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1\">Máxima</label>
                      <input type=\"number\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none\" placeholder=\"bpm\" value={formFcMax} onChange={(e) => setFormFcMax(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className=\"block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1\">Limiar (LTHR)</label>
                      <input type=\"number\" disabled={isReadOnly || isSavingAssessment} className=\"w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none\" placeholder=\"bpm\" value={formFcThreshold} onChange={(e) => setFormFcThreshold(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {calculatedVo2 && (
                  <div className=\"bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center animate-fade-in mt-4 shadow-inner\">
                    <p className=\"text-[10px] text-emerald-600 uppercase font-black tracking-widest\">VDOT Calculado</p>
                    <p className=\"text-3xl font-black text-emerald-900 italic tracking-tighter\">{calculatedVo2}</p>
                  </div>
                )}

                {!isReadOnly && (
                  <button
                    onClick={handleSaveAssessment}
                    disabled={!calculatedVo2 || isSavingAssessment}
                    className={`w-full text-white py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition flex justify-center items-center gap-2 disabled:opacity-30 ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    {isSavingAssessment ? (
                      <><Loader2 className=\"w-4 h-4 animate-spin\" /> Salvando...</>
                    ) : (
                      <><Save className=\"w-4 h-4\"/> {editingId ? 'Atualizar' : 'Salvar Registro'}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className=\"lg:col-span-2 space-y-6\">
            <div className=\"bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col\">
              <div className=\"p-6 border-b border-slate-50 flex justify-between items-center flex-wrap gap-4\">
                <h2 className=\"font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3 text-xl\">
                  <Activity className=\"text-emerald-600 w-6 h-6\" />
                  Zonas de Treinamento
                </h2>

                <div className=\"flex gap-2\">
                   {isEditingZones ? (
                     <>
                        <button onClick={handleRecalculateZones} title=\"Sincronizar com VDOT atual\" className=\"px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase italic flex items-center gap-2 hover:bg-emerald-100 transition shadow-sm border border-emerald-100\">
                          <RefreshCw className=\"w-3 h-3\" /> Recalcular VDOT
                        </button>
                        <button onClick={handleResetZones} className=\"px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-200 transition\">Padrão</button>
                        <button onClick={() => setIsEditingZones(false)} className=\"px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-200 transition\">Cancelar</button>
                        <button onClick={handleSaveZones} disabled={isSavingZones} className=\"px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase italic shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition\">
                          {isSavingZones ? <RefreshCw className=\"w-3 h-3 animate-spin\" /> : <Save className=\"w-3 h-3\" />} Salvar Zonas
                        </button>
                     </>
                   ) : (
                     !isReadOnly && <button onClick={handleStartZoneEdit} className=\"px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic shadow-lg hover:bg-black transition\">Editar Zonas</button>
                   )}
                </div>
              </div>

              <div className=\"overflow-x-auto custom-scrollbar\">
                <table className=\"w-full text-left\">
                  <thead>
                    <tr className=\"text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50\">
                      <th className=\"p-4\">Zona</th>
                      {!isEditingZones && <th className=\"p-4\">Sigla / Fisiologia</th>}
                      <th className=\"p-4 text-center\">Ritmo (Meta)</th>
                      <th className=\"p-4 text-center\">FC (BPM)</th>
                    </tr>
                  </thead>
                  <tbody className=\"divide-y divide-slate-50\">
                    {(isEditingZones ? editablePaces : currentPaces).map((p, idx) => (
                      <tr key={p.zone} className=\"hover:bg-slate-50/30 transition\">
                        <td className=\"p-4\">
                          <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-lg border-2
                            ${p.zone === 'Z1' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              p.zone === 'Z2' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              p.zone === 'Z3' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              p.zone === 'Z4' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            {p.zone}
                          </div>
                        </td>
                        {!isEditingZones && (
                          <td className=\"p-4\">
                            <div className=\"font-black text-slate-900 text-[11px] uppercase italic tracking-tight\">{p.name}</div>
                            <div className=\"text-[9px] text-slate-400 font-medium italic\">{p.description}</div>
                          </td>
                        )}
                        <td className=\"p-4 text-center\">
                          {isEditingZones ? (
                            <div className=\"flex items-center gap-1 justify-center\">
                              <input
                                className=\"w-16 p-1 border border-slate-200 rounded text-xs font-bold text-center bg-slate-50 outline-none focus:ring-1 focus:ring-emerald-500\"
                                value={p.minPace}
                                onChange={(e) => handleZoneChange(idx, 'minPace', e.target.value)}
                              />
                              <span className=\"text-slate-400\">-</span>
                              <input
                                className=\"w-16 p-1 border border-slate-200 rounded text-xs font-bold text-center bg-slate-50 outline-none focus:ring-1 focus:ring-emerald-500\"
                                value={p.maxPace}
                                onChange={(e) => handleZoneChange(idx, 'maxPace', e.target.value)}
                              />
                            </div>
                          ) : (
                            <span className=\"font-black text-slate-800 text-lg tracking-tighter italic\">{p.minPace} - {p.maxPace}</span>
                          )}
                        </td>
                        <td className=\"p-4 text-center\">
                          {isEditingZones ? (
                            <input
                              className=\"w-full p-1 border border-slate-200 rounded text-xs font-bold text-center bg-slate-50 outline-none focus:ring-1 focus:ring-emerald-500\"
                              value={p.heartRateRange}
                              onChange={(e) => handleZoneChange(idx, 'heartRateRange', e.target.value)}
                            />
                          ) : (
                            <span className=\"inline-flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-black italic shadow-sm border border-red-100\">
                              <Heart className=\"w-3 h-3\" /> {p.heartRateRange && p.heartRateRange !== '---' ? p.heartRateRange : 'Definir FC'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className=\"bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden shadow-xl shadow-slate-200/40\">
                <div className=\"p-4 border-b border-slate-50 bg-slate-50 font-black text-slate-400 uppercase text-[10px] tracking-widest flex items-center gap-2 italic\">
                   <History className=\"w-4 h-4 text-emerald-500\" /> Histórico de Evolução
                </div>
                <div className=\"max-h-64 overflow-y-auto custom-scrollbar\">
                    <table className=\"w-full text-xs text-left\">
                       <tbody className=\"divide-y divide-slate-50\">
                         {(activeAthlete.assessmentHistory || []).map((assessment) => (
                           <tr key={assessment.id} className=\"hover:bg-slate-50/50 transition-colors group\">
                             <td className=\"p-4 text-slate-500 font-bold\">{new Date(assessment.date).toLocaleDateString('pt-BR')}</td>
                             <td className=\"p-4 font-black uppercase text-emerald-600 italic tracking-tighter\">{assessment.type}</td>
                             <td className=\"p-4 font-black text-slate-700 italic tracking-tight\">{assessment.resultValue}</td>
                             <td className=\"p-4 font-black text-slate-900 text-lg tracking-tighter italic\">{assessment.calculatedVdot}</td>
                             {!isReadOnly && (
                               <td className=\"p-4 flex justify-end gap-3 transition-opacity\">
                                  <button
                                    onClick={() => handleEditHistory(assessment)}
                                    className=\"p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg border border-emerald-500\"
                                    title=\"Editar Avaliação\"
                                  >
                                    <Edit2 className=\"w-4 h-4\" />
                                  </button>
                                  <button
                                    onClick={(e) => confirmDelete(e, assessment.id)}
                                    className=\"p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg border border-red-500\"
                                    title=\"Excluir Avaliação\"
                                  >
                                    <Trash2 className=\"w-4 h-4\" />
                                  </button>
                               </td>
                             )}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {(activeAthlete.assessmentHistory || []).length === 0 && (
                       <div className=\"py-10 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic\">Sem histórico de testes.</div>
                     )}
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Assessments;
\"\"\"

with open('pages/Athletes.tsx', 'w') as f:
    f.write(athletes_content)

with open('pages/Assessments.tsx', 'w') as f:
    f.write(assessments_content)
