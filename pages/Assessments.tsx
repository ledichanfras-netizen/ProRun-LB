
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateVO2, calculatePaces } from '../utils/calculations';
import { TrainingPace, Assessment } from '../types';
import { Calculator, Save, Activity, Wind, Heart, History, Info, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Edit2, Trash2, X, RotateCcw, AlertTriangle } from 'lucide-react';

const Assessments: React.FC = () => {
  const { athletes, selectedAthleteId, addNewAssessment, updateAssessment, deleteAssessment, updateAthlete, userRole } = useApp();
  
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const isReadOnly = userRole === 'athlete';

  // Helper para obter data atual em SP formatada para input[type="date"]
  const getSaoPauloDate = () => {
    const d = new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // en-CA retorna YYYY-MM-DD
  };

  // Toggle between Test Types
  const [testType, setTestType] = useState<'3k' | 'VO2_Lab' | 'TRF'>('3k');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(getSaoPauloDate());
  const [formTime3k, setFormTime3k] = useState('');
  
  // TRF State
  const [formTrfDistance, setFormTrfDistance] = useState<number>(5); // Default 5km
  const [formTrfTime, setFormTrfTime] = useState('');

  // Physiological Stats (Shared across tests)
  const [formVo2Max, setFormVo2Max] = useState<number | ''>('');
  const [formFcMax, setFormFcMax] = useState<number | ''>('');
  const [formFcThreshold, setFormFcThreshold] = useState<number | ''>('');

  const [calculatedVo2, setCalculatedVo2] = useState<number | null>(null);
  const [paces, setPaces] = useState<TrainingPace[]>([]);
  const [showProtocol, setShowProtocol] = useState(false);

  // Zone Editing State
  const [isEditingZones, setIsEditingZones] = useState(false);
  const [editablePaces, setEditablePaces] = useState<TrainingPace[]>([]);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // Initialize view with current athlete data
  useEffect(() => {
    if (activeAthlete) {
      if (!editingId) {
        if (activeAthlete.metrics.fcMax) setFormFcMax(activeAthlete.metrics.fcMax);
        else setFormFcMax('');
        
        if (activeAthlete.metrics.fcThreshold) setFormFcThreshold(activeAthlete.metrics.fcThreshold);
        else setFormFcThreshold('');
      }

      if (activeAthlete.customZones && activeAthlete.customZones.length > 0) {
        setPaces(activeAthlete.customZones);
      } else {
        setPaces(calculatePaces(
          activeAthlete.metrics.vdot,
          activeAthlete.metrics.fcThreshold,
          activeAthlete.metrics.fcMax
        ));
      }
    } else {
      setPaces([]);
    }
  }, [activeAthlete, editingId]);

  const handleSimulate3k = (time: string) => {
    if (!time.includes(':') || time.length < 4) return;
    const vo2 = calculateVO2(time, 3);
    setCalculatedVo2(vo2);
  };

  const handleSimulateTrf = (time: string) => {
    if (!time.includes(':') || time.length < 4 || !formTrfDistance) return;
    const vo2 = calculateVO2(time, formTrfDistance);
    setCalculatedVo2(vo2);
  };

  useEffect(() => {
    if (testType === 'VO2_Lab' && formVo2Max) {
      setCalculatedVo2(Number(formVo2Max));
    }
  }, [formVo2Max, testType]);

  const handleSaveAssessment = () => {
    if (isReadOnly) return;
    if (!activeAthlete || !calculatedVo2) {
      alert('Dados incompletos.');
      return;
    }

    let resultValue = '';
    if (testType === '3k') resultValue = formTime3k;
    else if (testType === 'TRF') resultValue = `${formTrfTime} (${formTrfDistance}km)`;
    else resultValue = `${formVo2Max} ml/kg/min`;

    const assessmentData: Assessment = {
      id: editingId || crypto.randomUUID(), 
      date: formDate,
      type: testType,
      resultValue: resultValue,
      calculatedVdot: calculatedVo2, 
      vo2Max: testType === 'VO2_Lab' ? Number(formVo2Max) : undefined,
      fcMax: formFcMax ? Number(formFcMax) : undefined,
      fcThreshold: formFcThreshold ? Number(formFcThreshold) : undefined,
      distanceKm: testType === 'TRF' ? formTrfDistance : undefined,
    };
    
    if (editingId) {
      updateAssessment(activeAthlete.id, assessmentData);
    } else {
      addNewAssessment(activeAthlete.id, assessmentData);
    }
    
    handleCancelEdit(); 
  };

  const handleEditHistory = (assessment: Assessment) => {
    setEditingId(assessment.id);
    setTestType(assessment.type);
    setFormDate(assessment.date);
    setCalculatedVo2(assessment.calculatedVdot);
    
    setFormFcMax(assessment.fcMax || '');
    setFormFcThreshold(assessment.fcThreshold || '');
    setFormVo2Max(assessment.vo2Max || '');

    if (assessment.type === '3k') {
      setFormTime3k(assessment.resultValue);
    } else if (assessment.type === 'TRF') {
      const parts = assessment.resultValue.split(' (');
      if (parts.length > 0) setFormTrfTime(parts[0]);
      if (assessment.distanceKm) setFormTrfDistance(assessment.distanceKm);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (activeAthlete && deleteModal.id) {
      await deleteAssessment(activeAthlete.id, deleteModal.id);
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleStartZoneEdit = () => {
    setEditablePaces([...paces]);
    setIsEditingZones(true);
  };

  const handleZoneChange = (index: number, field: keyof TrainingPace, value: string) => {
    const newPaces = [...editablePaces];
    newPaces[index] = { ...newPaces[index], [field]: value };
    setEditablePaces(newPaces);
  };

  const handleSaveZones = async () => {
    if (activeAthlete) {
      await updateAthlete(activeAthlete.id, { customZones: editablePaces });
      setIsEditingZones(false);
    }
  };

  const handleResetZones = async () => {
    if (activeAthlete && window.confirm('Restaurar cálculos automáticos?')) {
      await updateAthlete(activeAthlete.id, { customZones: undefined });
      setIsEditingZones(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormDate(getSaoPauloDate());
    setFormTime3k('');
    setFormTrfTime('');
    setFormTrfDistance(5);
    setFormVo2Max('');
    setFormFcMax(activeAthlete?.metrics.fcMax || '');
    setFormFcThreshold(activeAthlete?.metrics.fcThreshold || '');
    setCalculatedVo2(null);
  };

  return (
    <div className="space-y-6 relative animate-fade-in">
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up border-l-8 border-red-500">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <div className="bg-red-50 p-2 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
               <h3 className="text-xl font-black uppercase italic tracking-tighter">Excluir Avaliação?</h3>
             </div>
             <p className="text-slate-600 mb-6 text-sm font-medium italic">As métricas do atleta podem ser recalculadas.</p>
             <div className="flex gap-3 justify-end">
               <button onClick={() => setDeleteModal({ isOpen: false, id: null })} className="px-6 py-2 text-slate-400 font-black text-xs uppercase hover:text-slate-600">Cancelar</button>
               <button onClick={executeDelete} className="px-6 py-2 bg-red-600 text-white rounded-xl font-black text-xs uppercase">Confirmar</button>
             </div>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Avaliações & Zonas</h1>
        <p className="text-slate-500 font-medium">Calibração técnica e fisiológica (Fuso: SP).</p>
      </header>

      {!activeAthlete ? (
         <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-3xl flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm text-emerald-700 font-black uppercase italic tracking-tight">Selecione um atleta no menu lateral para gerenciar as zonas.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${editingId ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-black flex items-center gap-2 text-slate-900 uppercase italic tracking-tighter">
                  <Calculator className="text-emerald-600 w-5 h-5" /> 
                  {isReadOnly ? 'Simulador' : editingId ? 'Editar Teste' : 'Novo Teste'}
                </h2>
                {editingId && <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>}
              </div>
              
              <div className="flex bg-slate-50 p-1 rounded-xl mb-6 overflow-x-auto">
                {['3k', 'TRF', 'VO2_Lab'].map(t => (
                  <button key={t} onClick={() => setTestType(t as any)} className={`flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition whitespace-nowrap ${testType === t ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    {t === '3k' ? 'Teste 3km' : t === 'TRF' ? 'TRF (Campo)' : 'Laboratório'}
                  </button>
                ))}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data</label>
                  <input type="date" disabled={isReadOnly} className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold disabled:opacity-50" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>

                {testType === '3k' && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tempo 3km (MM:SS)</label>
                    <input type="text" placeholder="Ex: 12:30" disabled={isReadOnly} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic" value={formTime3k} onChange={(e) => { setFormTime3k(e.target.value); if (e.target.value.length >= 4) handleSimulate3k(e.target.value); }} />
                  </div>
                )}

                {testType === 'TRF' && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Distância (km)</label>
                      <input type="number" disabled={isReadOnly} className="w-full p-3 bg-slate-50 border-none rounded-2xl font-bold" value={formTrfDistance} onChange={(e) => setFormTrfDistance(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tempo Total (MM:SS)</label>
                      <input type="text" placeholder="Ex: 22:15" disabled={isReadOnly} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic" value={formTrfTime} onChange={(e) => { setFormTrfTime(e.target.value); if (e.target.value.length >= 4) handleSimulateTrf(e.target.value); }} />
                    </div>
                  </div>
                )}

                {testType === 'VO2_Lab' && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">VO2Max (ml/kg/min)</label>
                    <input type="number" disabled={isReadOnly} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl italic" value={formVo2Max} onChange={(e) => setFormVo2Max(Number(e.target.value))} />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-50">
                  <h3 className="text-[9px] font-black uppercase text-emerald-600 mb-3 flex items-center gap-1 italic"><Heart className="w-3 h-3" /> Frequência Cardíaca</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Máxima</label>
                      <input type="number" disabled={isReadOnly} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" placeholder="bpm" value={formFcMax} onChange={(e) => setFormFcMax(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Limiar</label>
                      <input type="number" disabled={isReadOnly} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold" placeholder="bpm" value={formFcThreshold} onChange={(e) => setFormFcThreshold(Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {calculatedVo2 && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center animate-fade-in mt-4">
                    <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">VDOT Calculado</p>
                    <p className="text-3xl font-black text-emerald-900 italic tracking-tighter">{calculatedVo2}</p>
                  </div>
                )}

                {!isReadOnly && (
                  <button onClick={handleSaveAssessment} disabled={!calculatedVo2} className={`w-full text-white py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition flex justify-center items-center gap-2 disabled:opacity-30 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                    <Save className="w-4 h-4"/> {editingId ? 'Atualizar' : 'Salvar Registro'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center flex-wrap gap-4">
                <h2 className="font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3 text-xl">
                  <Activity className="text-emerald-600 w-6 h-6" /> 
                  Zonas de Treinamento
                </h2>
                
                <div className="flex gap-2">
                   {isEditingZones ? (
                     <>
                        <button onClick={handleResetZones} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic">Restaurar</button>
                        <button onClick={() => setIsEditingZones(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase italic">Cancelar</button>
                        <button onClick={handleSaveZones} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase italic shadow-lg">Salvar</button>
                     </>
                   ) : (
                     !isReadOnly && <button onClick={handleStartZoneEdit} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase italic shadow-lg">Editar Zonas</button>
                   )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="p-4">Zona</th>
                      {!isEditingZones && <th className="p-4">Sigla / Fisiologia</th>}
                      <th className="p-4 text-center">Ritmo (Meta)</th>
                      <th className="p-4 text-center">FC (BPM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(isEditingZones ? editablePaces : paces).map((p, idx) => (
                      <tr key={p.zone} className="hover:bg-slate-50/30 transition">
                        <td className="p-4">
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
                          <td className="p-4">
                            <div className="font-black text-slate-900 text-[11px] uppercase italic tracking-tight">{p.name}</div>
                            <div className="text-[9px] text-slate-400 font-medium italic">{p.description}</div>
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <span className="font-black text-slate-800 text-lg tracking-tighter italic">{p.minPace} - {p.maxPace}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-black italic">
                            <Heart className="w-3 h-3" /> {p.heartRateRange}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50 font-black text-slate-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                   <History className="w-4 h-4 text-emerald-500" /> Histórico de Evolução
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                       <tbody className="divide-y divide-slate-50">
                         {(activeAthlete.assessmentHistory || []).map((assessment) => (
                           <tr key={assessment.id} className="hover:bg-slate-50/50 transition">
                             <td className="p-4 text-slate-500 font-bold">{new Date(assessment.date).toLocaleDateString('pt-BR')}</td>
                             <td className="p-4 font-black uppercase text-emerald-600 italic">{assessment.type}</td>
                             <td className="p-4 font-black text-slate-700 italic">{assessment.resultValue}</td>
                             <td className="p-4 font-black text-slate-900 text-lg tracking-tighter">{assessment.calculatedVdot}</td>
                             {!isReadOnly && (
                               <td className="p-4 flex justify-end gap-1">
                                  <button onClick={() => handleEditHistory(assessment)} className="p-2 text-slate-300 hover:text-emerald-600 transition"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={(e) => confirmDelete(e, assessment.id)} className="p-2 text-slate-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                               </td>
                             )}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessments;
