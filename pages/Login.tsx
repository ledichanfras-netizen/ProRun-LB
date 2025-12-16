
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TrendingUp, User, Users, Lock, ChevronLeft, ArrowRight, AlertCircle, ChevronRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login, athletes } = useApp();
  const navigate = useNavigate();
  
  // Navigation Steps
  const [step, setStep] = useState<'role' | 'password-coach' | 'athlete-select' | 'password-athlete'>('role');
  
  // Authentication State
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedAthleteIdForLogin, setSelectedAthleteIdForLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- COACH LOGIN LOGIC ---
  const initiateCoachLogin = () => {
    setStep('password-coach');
    setPasswordInput('');
    setError(null);
  };

  const verifyCoachPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1234') {
      login('coach');
      navigate('/');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  // --- ATHLETE LOGIN LOGIC ---
  const initiateAthleteSelection = () => {
    setStep('athlete-select');
    setError(null);
  };

  const initiateAthletePassword = (athleteId: string) => {
    setSelectedAthleteIdForLogin(athleteId);
    setStep('password-athlete');
    setPasswordInput('');
    setError(null);
  };

  const verifyAthletePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const athlete = athletes.find(a => a.id === selectedAthleteIdForLogin);
    
    if (!athlete) {
      setError('Erro ao identificar atleta.');
      return;
    }

    if (!athlete.birthDate) {
       setError('Sua Data de Nascimento não está cadastrada. Contate seu treinador.');
       return;
    }

    // Expected format: DDMMAAAA (from YYYY-MM-DD)
    const [year, month, day] = athlete.birthDate.split('-');
    const expectedPassword = `${day}${month}${year}`;

    if (passwordInput === expectedPassword) {
      login('athlete', athlete.id);
      navigate('/');
    } else {
      setError('Senha incorreta (Use sua Data de Nascimento: DDMMAAAA).');
    }
  };

  const handleBack = () => {
    if (step === 'password-coach' || step === 'athlete-select') setStep('role');
    else if (step === 'password-athlete') setStep('athlete-select');
    setError(null);
    setPasswordInput('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in-up">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-500 p-3 rounded-xl mb-4 shadow-lg shadow-green-500/20">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ProRun Coach</h1>
          <p className="text-slate-500">Plataforma de Treinamento Inteligente</p>
        </div>

        {/* STEP 1: SELECT ROLE */}
        {step === 'role' && (
          <div className="space-y-4">
            <button
              onClick={initiateCoachLogin}
              className="w-full group relative flex items-center p-4 bg-slate-50 border-2 border-slate-100 hover:border-blue-500 rounded-xl transition-all"
            >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-bold text-slate-800">Área do Treinador</h3>
                <p className="text-sm text-slate-500">Acesso Administrativo</p>
              </div>
            </button>

            <button
              onClick={initiateAthleteSelection}
              className="w-full group relative flex items-center p-4 bg-slate-50 border-2 border-slate-100 hover:border-green-500 rounded-xl transition-all"
            >
              <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-bold text-slate-800">Área do Atleta</h3>
                <p className="text-sm text-slate-500">Ver meus treinos e stats</p>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2a: COACH PASSWORD */}
        {step === 'password-coach' && (
          <form onSubmit={verifyCoachPassword} className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-2 mb-4">
               <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-600"><ChevronLeft/></button>
               <h3 className="font-bold text-slate-800">Login do Treinador</h3>
             </div>
             
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Senha de Acesso</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                 <input 
                    type="password" 
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Digite sua senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                 />
               </div>
             </div>

             {error && (
               <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> {error}
               </div>
             )}

             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition">
               Entrar no Sistema <ArrowRight className="w-4 h-4" />
             </button>
          </form>
        )}

        {/* STEP 2b: SELECT ATHLETE */}
        {step === 'athlete-select' && (
           <div className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-2 mb-2">
               <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-600"><ChevronLeft/></button>
               <h3 className="font-bold text-slate-800">Quem é você?</h3>
             </div>
             
             <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
               {athletes.length === 0 ? (
                 <p className="text-center text-slate-500 py-4 italic">Nenhum atleta cadastrado.</p>
               ) : (
                 athletes.map(athlete => (
                   <button
                     key={athlete.id}
                     onClick={() => initiateAthletePassword(athlete.id)}
                     className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition flex items-center justify-between group"
                   >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-green-100 group-hover:text-green-700">
                          {athlete.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700">{athlete.name}</span>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                   </button>
                 ))
               )}
             </div>
          </div>
        )}

        {/* STEP 3b: ATHLETE PASSWORD */}
        {step === 'password-athlete' && (
           <form onSubmit={verifyAthletePassword} className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-2 mb-4">
               <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-600"><ChevronLeft/></button>
               <h3 className="font-bold text-slate-800">Confirmar Identidade</h3>
             </div>
             
             <div className="bg-blue-50 p-4 rounded-lg mb-4 text-center">
                <p className="text-sm text-blue-800 font-medium">
                  Atleta: <span className="font-bold">{athletes.find(a => a.id === selectedAthleteIdForLogin)?.name}</span>
                </p>
             </div>

             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Senha (Data de Nascimento)</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                 <input 
                    type="password"
                    inputMode="numeric" 
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="DDMMAAAA"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                 />
               </div>
               <p className="text-xs text-slate-400 mt-1 pl-1">Formato: Dia, Mês e Ano (Ex: 31011990)</p>
             </div>

             {error && (
               <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> {error}
               </div>
             )}

             <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition">
               Acessar Portal <ArrowRight className="w-4 h-4" />
             </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
