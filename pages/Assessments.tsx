
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateVDOT, calculatePaces } from '../utils/calculations';
import { TrainingPace, Assessment } from '../types';
import { Calculator, Save, Activity, Wind, Heart, History, Info, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Edit2, Trash2, X, RotateCcw, AlertTriangle } from 'lucide-react';

const Assessments: React.FC = () => {
  const { athletes, selectedAthleteId, addNewAssessment, updateAssessment, deleteAssessment, updateAthlete, userRole } = useApp();
  
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const isReadOnly = userRole === 'athlete';

  // Toggle between Test Types
  const [testType, setTestType] = useState<'3k' | 'VO2_Lab' | 'TRF'>('3k');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime3k, setFormTime3k] = useState('');
  
  // TRF State
  const [formTrfDistance, setFormTrfDistance] = useState<number>(5); // Default 5km
  const [formTrfTime, setFormTrfTime] = useState('');

  // Physiological Stats (Shared across tests)
  const [formVo2Max, setFormVo2Max] = useState<number | ''>('');
  const [formFcMax, setFormFcMax] = useState<number | ''>('');
  const [formFcThreshold, setFormFcThreshold] = useState<number | ''>('');

  const [calculatedVdot, setCalculatedVdot] = useState<number | null>(null);
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
      // Only set these if NOT editing a specific history item
      if (!editingId) {
        if (activeAthlete.metrics.fcMax) setFormFcMax(activeAthlete.metrics.fcMax);
        else setFormFcMax('');
        
        if (activeAthlete.metrics.fcThreshold) setFormFcThreshold(activeAthlete.metrics.fcThreshold);
        else setFormFcThreshold('');
      }

      // Priority: Custom Zones -> Calculated Zones
      if (activeAthlete.customZones && activeAthlete.customZones.length > 0) {
        setPaces(activeAthlete.customZones);
      } else {
        // Calculate zones based on stored VDOT and Heart Rate data
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

  // Handle Simulation for 3k
  const handleSimulate3k = (time: string) => {
    if (!time.includes(':') || time.length < 4) return;
    const vdot = calculateVDOT(time, 3);
    setCalculatedVdot(vdot);
  };

  // Handle Simulation for TRF (variable distance)
  const handleSimulateTrf = (time: string) => {
    if (!time.includes(':') || time.length < 4 || !formTrfDistance) return;
    const vdot = calculateVDOT(time, formTrfDistance);
    setCalculatedVdot(vdot);
  };

  // Handle Simulation for VO2 Lab (Direct VDOT mapping)
  useEffect(() => {
    if (testType === 'VO2_Lab' && formVo2Max) {
      // Logic: For practical purposes, we treat Measured VO2Max as the VDOT
      setCalculatedVdot(Number(formVo2Max));
    }
  }, [formVo2Max, testType]);

  const handleSaveAssessment = () => {
    if (isReadOnly) return;
    if (!activeAthlete || !calculatedVdot) {
      alert('Dados incompletos.');
      return;
    }

    let resultValue = '';
    if (testType === '3k') resultValue = formTime3k;
    else if (testType === 'TRF') resultValue = `${formTrfTime} (${formTrfDistance}km)`;
    else resultValue = `${formVo2Max} ml/kg/min`;

    const assessmentData: Assessment = {
      id: editingId || crypto.randomUUID(), // Use existing ID if editing
      date: formDate,
      type: testType,
      resultValue: resultValue,
      calculatedVdot: calculatedVdot,
      // Optional physiological data
      vo2Max: testType === 'VO2_Lab' ? Number(formVo2Max) : undefined,
      fcMax: formFcMax ? Number(formFcMax) : undefined,
      fcThreshold: formFcThreshold ? Number(formFcThreshold) : undefined,
      distanceKm: testType === 'TRF' ? formTrfDistance : undefined,
    };
    
    if (editingId) {
      updateAssessment(activeAthlete.id, assessmentData);
      // Removed alert for smoother UX
    } else {
      addNewAssessment(activeAthlete.id, assessmentData);
    }
    
    handleCancelEdit(); // Reset form
  };

  const handleEditHistory = (assessment: Assessment) => {
    setEditingId(assessment.id);
    setTestType(assessment.type);
    setFormDate(assessment.date);
    setCalculatedVdot(assessment.calculatedVdot);
    
    setFormFcMax(assessment.fcMax || '');
    setFormFcThreshold(assessment.fcThreshold || '');
    setFormVo2Max(assessment.vo2Max || '');

    if (assessment.type === '3k') {
      setFormTime3k(assessment.resultValue);
    } else if (assessment.type === 'TRF') {
      // Parse "22:15 (5km)" -> time: 22:15, dist: 5
      const parts = assessment.resultValue.split(' (');
      if (parts.length > 0) setFormTrfTime(parts[0]);
      if (assessment.distanceKm) setFormTrfDistance(assessment.distanceKm);
    } else if (assessment.type === 'VO2_Lab') {
      // VO2Max is already set via assessment.vo2Max or extracted from string
    }
    
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- DELETE MODAL HANDLERS ---
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

  // --- ZONE EDITING HANDLERS ---
  const handleStartZoneEdit = () => {
    setEditablePaces([...paces]); // Clone current visible paces
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
    if (activeAthlete && window.confirm('Deseja restaurar os cálculos automáticos baseados no VDOT?')) {
      await updateAthlete(activeAthlete.id, { customZones: undefined }); // Remove field from DB
      setIsEditingZones(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime3k('');
    setFormTrfTime('');
    setFormTrfDistance(5);
    setFormVo2Max('');
    setFormFcMax(activeAthlete?.metrics.fcMax || '');
    setFormFcThreshold(activeAthlete?.metrics.fcThreshold || '');
    setCalculatedVdot(null);
  };

  return (
    <div className="space-y-6 relative">
      {/* CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <div className="bg-red-100 p-2 rounded-full">
                 <AlertTriangle className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-bold">Excluir Avaliação?</h3>
             </div>
             <p className="text-slate-600 mb-6 text-sm">
               Tem certeza que deseja excluir este histórico? As métricas do atleta podem ser recalculadas para o teste anterior.
             </p>
             <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setDeleteModal({ isOpen: false, id: null })}
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

      <header>
        <h1 className="text-2xl font-bold text-slate-800">Avaliações & Zonas</h1>
        <p className="text-slate-500">
           {isReadOnly ? 'Visualize seus resultados e zonas de treino.' : 'Gerencie testes de campo e laboratoriais.'}
        </p>
      </header>

      {!activeAthlete ? (
         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Selecione um atleta para gerenciar avaliações.</p>
              </div>
            </div>
          </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Actions & Form */}
          <div className="space-y-6">
            
            {/* New/Edit Assessment Card */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border ${editingId ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Calculator className="text-blue-600 w-5 h-5" /> 
                  {isReadOnly ? 'Simulador' : editingId ? 'Editar Avaliação' : 'Nova Avaliação'}
                </h2>
                {editingId && (
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Type Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-6 overflow-x-auto">
                <button 
                   onClick={() => setTestType('3k')}
                   className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition whitespace-nowrap ${testType === '3k' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Teste 3km
                </button>
                <button 
                   onClick={() => setTestType('TRF')}
                   className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition whitespace-nowrap ${testType === 'TRF' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  TRF (Referência)
                </button>
                <button 
                   onClick={() => setTestType('VO2_Lab')}
                   className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition whitespace-nowrap ${testType === 'VO2_Lab' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Lab (VO2)
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data do Teste</label>
                  <input 
                    type="date" 
                    disabled={isReadOnly}
                    className="w-full p-2 border border-slate-300 rounded text-sm disabled:bg-slate-50"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>

                {testType === '3k' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                       Tempo nos 3km (MM:SS)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 12:30"
                      disabled={isReadOnly}
                      className="w-full p-3 border border-slate-300 rounded-lg font-mono text-lg placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formTime3k}
                      onChange={(e) => {
                        setFormTime3k(e.target.value);
                        if (e.target.value.length >= 4) handleSimulate3k(e.target.value);
                      }}
                    />
                  </div>
                )}

                {testType === 'TRF' && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Distância do Teste (km)
                      </label>
                      <input 
                        type="number" 
                        disabled={isReadOnly}
                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: 5"
                        value={formTrfDistance}
                        onChange={(e) => {
                           const d = Number(e.target.value);
                           setFormTrfDistance(d);
                           if (formTrfTime.length >= 4 && d > 0) {
                              const vdot = calculateVDOT(formTrfTime, d);
                              setCalculatedVdot(vdot);
                           }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                         Tempo Total (MM:SS)
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ex: 22:15"
                        disabled={isReadOnly}
                        className="w-full p-3 border border-slate-300 rounded-lg font-mono text-lg placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formTrfTime}
                        onChange={(e) => {
                          setFormTrfTime(e.target.value);
                          if (e.target.value.length >= 4) handleSimulateTrf(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                )}

                {testType === 'VO2_Lab' && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                         VO2Max Obtido (ml/kg/min)
                      </label>
                      <input 
                        type="number"
                        disabled={isReadOnly}
                        className="w-full p-3 border border-slate-300 rounded-lg font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: 54"
                        value={formVo2Max}
                        onChange={(e) => setFormVo2Max(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {/* Heart Rate Section (Available for ALL tests) */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Dados Cardíacos (Opcional)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">FC Máxima (bpm)</label>
                      <input 
                        type="number"
                        disabled={isReadOnly}
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-red-200 outline-none"
                        placeholder="Ex: 195"
                        value={formFcMax}
                        onChange={(e) => setFormFcMax(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Limiar (FCLA)</label>
                      <input 
                        type="number"
                        disabled={isReadOnly}
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-red-200 outline-none"
                        placeholder="Ex: 172"
                        value={formFcThreshold}
                        onChange={(e) => setFormFcThreshold(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Preencha para calcular as zonas baseadas em batimentos cardíacos.
                  </p>
                </div>

                {calculatedVdot && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-center animate-fade-in mt-4">
                    <p className="text-xs text-blue-600 uppercase font-bold tracking-wider">Novo VDOT Estimado</p>
                    <p className="text-3xl font-bold text-blue-800">{calculatedVdot}</p>
                    {calculatedVdot > activeAthlete.metrics.vdot && !editingId && (
                       <span className="text-xs text-green-600 flex justify-center items-center gap-1 font-medium mt-1">
                         <TrendingUp className="w-3 h-3" /> Melhora de {(calculatedVdot - activeAthlete.metrics.vdot).toFixed(1)}
                       </span>
                    )}
                  </div>
                )}

                {!isReadOnly && (
                  <div className="flex gap-2">
                    {editingId && (
                       <button 
                        onClick={handleCancelEdit}
                        className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-medium transition"
                      >
                        Cancelar
                      </button>
                    )}
                    <button 
                      onClick={handleSaveAssessment}
                      disabled={!calculatedVdot}
                      className={`flex-1 text-white py-2 rounded-lg font-medium shadow-sm transition flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed
                        ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      <Save className="w-4 h-4"/> {editingId ? 'Atualizar' : 'Salvar Teste'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Protocol Explanation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <button 
                onClick={() => setShowProtocol(!showProtocol)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition text-left"
               >
                 <span className="font-bold text-slate-700 flex items-center gap-2">
                   <Info className="w-4 h-4 text-blue-500" /> Protocolo e Orientação
                 </span>
                 {showProtocol ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
               </button>
               
               {showProtocol && (
                 <div className="p-4 text-sm text-slate-600 space-y-3 bg-white border-t border-slate-100">
                    {testType === '3k' && (
                      <>
                        <p className="font-bold text-slate-800">Teste de 3km (Campo)</p>
                        <p>Ideal para estimar o VDOT e zonas de velocidade (I, R).</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><span className="font-bold">Aquecimento:</span> 15-20 min trote leve + 4x30s ritmo de prova.</li>
                          <li><span className="font-bold">Principal:</span> Correr 3km no menor tempo possível (Ritmo forte e constante).</li>
                          <li><span className="font-bold">Recuperação:</span> 10-15 min trote leve.</li>
                        </ul>
                      </>
                    )}
                    {testType === 'TRF' && (
                      <>
                         <p className="font-bold text-slate-800">TRF (Teste de Referência - 5km/10km)</p>
                         <p>Ideal para calibrar o Limiar Anaeróbio (Zona L) e Ritmo de Maratona (M).</p>
                         <ul className="list-disc pl-4 space-y-1">
                          <li><span className="font-bold">Aquecimento:</span> 15 min leve + 4 'tiros' de 15s para ativar.</li>
                          <li><span className="font-bold">Principal:</span> Correr a distância (ex: 5km) no máximo esforço sustentável. Mantenha o ritmo constante.</li>
                          <li><span className="font-bold">Input:</span> Insira a distância e o tempo total aqui. Se usou frequencímetro, insira a FC Máxima atingida.</li>
                        </ul>
                      </>
                    )}
                    {testType === 'VO2_Lab' && (
                      <>
                        <p className="font-bold text-slate-800">Teste de Esteira (Ergoespirometria)</p>
                        <p>Realizado em laboratório com máscara de análise de gases.</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>O protocolo geralmente é de rampa (aumento de velocidade/inclinação a cada min).</li>
                          <li>Objetivo: Encontrar VO2Max, Frequência Cardíaca Máxima e Limiar Anaeróbio (FCLA).</li>
                          <li>Insira os dados obtidos no laudo médico.</li>
                        </ul>
                      </>
                    )}
                 </div>
               )}
            </div>
          </div>

          {/* RIGHT COLUMN: Results & History */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Stats Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md">
                 <p className="text-xs text-slate-400 uppercase font-bold">VDOT</p>
                 <p className="text-3xl font-bold text-green-400">{activeAthlete.metrics.vdot}</p>
               </div>
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-bold">VO2Max</p>
                 <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-slate-800">{activeAthlete.metrics.vo2Max || '-'}</p>
                    <span className="text-xs text-slate-400 mb-1">ml/kg</span>
                 </div>
               </div>
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-bold">FC Limiar</p>
                 <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-slate-800">{activeAthlete.metrics.fcThreshold || '-'}</p>
                    <span className="text-xs text-slate-400 mb-1">bpm</span>
                 </div>
               </div>
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-bold">FC Máxima</p>
                 <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-slate-800">{activeAthlete.metrics.fcMax || '-'}</p>
                    <span className="text-xs text-slate-400 mb-1">bpm</span>
                 </div>
               </div>
            </div>

            {/* History Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
                   <History className="w-4 h-4" /> Histórico de Testes
                </div>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                       <thead>
                         <tr className="text-slate-400 text-xs border-b border-slate-100 bg-slate-50/50 sticky top-0">
                           <th className="p-3">Data</th>
                           <th className="p-3">Tipo</th>
                           <th className="p-3">Resultado</th>
                           <th className="p-3">VDOT</th>
                           {!isReadOnly && <th className="p-3 text-right">Ações</th>}
                         </tr>
                       </thead>
                       <tbody>
                         {(activeAthlete.assessmentHistory || []).map((assessment) => (
                           <tr key={assessment.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 transition ${editingId === assessment.id ? 'bg-orange-50' : ''}`}>
                             <td className="p-3 text-slate-600">{new Date(assessment.date).toLocaleDateString('pt-BR')}</td>
                             <td className="p-3">
                               <span className={`text-xs px-2 py-1 rounded 
                                 ${assessment.type === '3k' ? 'bg-blue-100 text-blue-700' : 
                                   assessment.type === 'TRF' ? 'bg-orange-100 text-orange-700' : 
                                   'bg-purple-100 text-purple-700'}`}>
                                 {assessment.type === '3k' ? 'Campo (3k)' : assessment.type === 'TRF' ? 'TRF (Ref)' : 'Esteira (Lab)'}
                               </span>
                             </td>
                             <td className="p-3 font-mono">{assessment.resultValue}</td>
                             <td className="p-3 font-bold text-slate-800">{assessment.calculatedVdot}</td>
                             {!isReadOnly && (
                               <td className="p-3 flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditHistory(assessment)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => confirmDelete(e, assessment.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                               </td>
                             )}
                           </tr>
                         ))}
                         {(activeAthlete.assessmentHistory || []).length === 0 && (
                           <tr><td colSpan={isReadOnly ? 4 : 5} className="p-4 text-center text-slate-400 text-xs italic">Nenhum teste registrado.</td></tr>
                         )}
                       </tbody>
                     </table>
                </div>
            </div>

            {/* Zones Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="text-green-600 w-5 h-5" /> 
                  Zonas de Treinamento
                </h2>
                
                <div className="flex gap-2">
                   {isEditingZones ? (
                     <>
                        <button 
                          onClick={handleResetZones}
                          className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                        </button>
                        <button 
                          onClick={() => setIsEditingZones(false)}
                          className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSaveZones}
                          className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow transition flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Salvar Edições
                        </button>
                     </>
                   ) : (
                     <>
                       {activeAthlete.customZones && activeAthlete.customZones.length > 0 && (
                         <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded border border-yellow-200 mr-2 flex items-center gap-1">
                           <Edit2 className="w-3 h-3" /> Personalizado
                         </span>
                       )}
                       {!isReadOnly && (
                         <button 
                          onClick={handleStartZoneEdit}
                          className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium border border-blue-200 transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Editar Zonas
                        </button>
                       )}
                     </>
                   )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                {paces.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                        <th className="p-4">Zona</th>
                        {!isEditingZones && <th className="p-4">Descrição</th>}
                        <th className="p-4 text-center">Pace (min/km)</th>
                        {!isEditingZones && <th className="p-4 text-center">Vel (km/h)</th>}
                        <th className="p-4 text-center text-red-500">FC (bpm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(isEditingZones ? editablePaces : paces).map((p, idx) => (
                        <tr key={p.zone} className="hover:bg-slate-50 transition">
                          <td className="p-4">
                            <span className={`
                              w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm border-2 shadow-sm
                              ${p.zone === 'F' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}
                              ${p.zone === 'M' ? 'border-green-200 bg-green-50 text-green-700' : ''}
                              ${p.zone === 'L' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : ''}
                              ${p.zone === 'I' ? 'border-orange-200 bg-orange-50 text-orange-700' : ''}
                              ${p.zone === 'R' ? 'border-red-200 bg-red-50 text-red-700' : ''}
                            `}>
                              {p.zone}
                            </span>
                          </td>
                          
                          {!isEditingZones && (
                            <td className="p-4">
                              <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                              <div className="text-xs text-slate-500 max-w-xs">{p.description}</div>
                            </td>
                          )}
                          
                          <td className="p-4 text-center">
                            {isEditingZones ? (
                              <div className="flex gap-1 justify-center items-center">
                                <input 
                                  className="w-16 p-1 text-center border rounded text-sm font-mono"
                                  value={p.minPace}
                                  onChange={(e) => handleZoneChange(idx, 'minPace', e.target.value)}
                                />
                                <span className="text-slate-400">-</span>
                                <input 
                                  className="w-16 p-1 text-center border rounded text-sm font-mono"
                                  value={p.maxPace}
                                  onChange={(e) => handleZoneChange(idx, 'maxPace', e.target.value)}
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-lg font-bold text-slate-700 whitespace-nowrap">{p.minPace} - {p.maxPace}</span>
                            )}
                          </td>
                          
                          {!isEditingZones && (
                            <td className="p-4 text-center text-slate-600 text-sm font-medium whitespace-nowrap">{p.speedKmh}</td>
                          )}

                          <td className="p-4 text-center">
                             {isEditingZones ? (
                               <input 
                                  className="w-24 p-1 text-center border rounded text-sm font-mono text-red-700"
                                  value={p.heartRateRange || ''}
                                  onChange={(e) => handleZoneChange(idx, 'heartRateRange', e.target.value)}
                                />
                             ) : (
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                                  <Heart className="w-3 h-3" /> {p.heartRateRange}
                                </span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Wind className="w-10 h-10 mb-2 opacity-20" />
                    <p>Zonas indisponíveis</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Assessments;
