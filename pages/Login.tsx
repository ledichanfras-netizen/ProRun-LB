
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, User, ArrowRight, AlertCircle, TrendingUp, Info } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Implementação de timeout para o login (5 segundos)
      const loginPromise = login(username, password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      const result = (await Promise.race([loginPromise, timeoutPromise])) as { success: boolean; message?: string };

      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || "Credenciais incorretas.");
      }
    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err.message === 'TIMEOUT') {
        setError("O servidor demorou a responder. Verifique sua conexão e tente novamente.");
      } else {
        setError("Ocorreu um erro ao tentar acessar o sistema.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4 transform -rotate-3">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">ProRun LB</h1>
          <p className="text-slate-500 font-medium text-center px-4 italic">Performance Integrada</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in border-l-4 border-red-500">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuário Registrado</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="text" 
                required
                autoComplete="username"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-bold"
                placeholder="Ex: Leandro Barbosa"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chave de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="password" 
                required
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-bold"
                placeholder="Data de Nascimento (DDMMAAAA)"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {username.length > 3 && (
              <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase italic tracking-tight animate-fade-in">
                <Info className="w-3 h-3" />
                Dica: Use sua data de nascimento sem barras (ex: 29121981)
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/30 flex justify-center items-center gap-2 transition disabled:opacity-50 uppercase italic tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Entrar no Sistema <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
           <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">© 2025 LB Sports Performance</p>
        </div>
      </div>
    </div>
  );
}
