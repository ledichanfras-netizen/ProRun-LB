
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TrendingUp, User, Users } from 'lucide-react';

const Login: React.FC = () => {
  const { login, athletes } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'athlete-select'>('role');

  const handleCoachLogin = () => {
    login('coach');
    navigate('/');
  };

  const handleAthleteLogin = (athleteId: string) => {
    login('athlete', athleteId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-500 p-3 rounded-xl mb-4 shadow-lg shadow-green-500/20">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ProRun Coach</h1>
          <p className="text-slate-500">Plataforma de Treinamento Inteligente</p>
        </div>

        {step === 'role' ? (
          <div className="space-y-4">
            <button
              onClick={handleCoachLogin}
              className="w-full group relative flex items-center p-4 bg-slate-50 border-2 border-slate-100 hover:border-blue-500 rounded-xl transition-all"
            >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-bold text-slate-800">Área do Treinador</h3>
                <p className="text-sm text-slate-500">Gerenciar atletas e treinos</p>
              </div>
            </button>

            <button
              onClick={() => setStep('athlete-select')}
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
        ) : (
          <div className="space-y-4 animate-fade-in">
             <h3 className="font-bold text-slate-800 mb-2">Selecione seu perfil:</h3>
             <div className="max-h-60 overflow-y-auto space-y-2">
               {athletes.map(athlete => (
                 <button
                   key={athlete.id}
                   onClick={() => handleAthleteLogin(athlete.id)}
                   className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition flex items-center justify-between"
                 >
                   <span className="font-medium text-slate-700">{athlete.name}</span>
                   <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{athlete.experience}</span>
                 </button>
               ))}
             </div>
             <button 
               onClick={() => setStep('role')}
               className="w-full py-2 text-slate-400 text-sm hover:text-slate-600"
             >
               Voltar
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
