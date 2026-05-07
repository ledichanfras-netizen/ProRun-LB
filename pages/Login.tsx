
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Lock, User, ArrowRight, AlertCircle, TrendingUp, Info, Cloud, CloudOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isCloudConnected } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || "Credenciais incorretas.");
      }
    } catch (err: any) {
      setError("Ocorreu um erro ao tentar acessar.");
      console.error("Erro no login:", err?.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-center items-center p-4 overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 p-0.5 bg-white rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.2)] border border-white/10 overflow-hidden transform hover:scale-110 transition-transform duration-500">
            <img src="/prorunlb_pwa_192_with_text.png" alt="ProRun LB" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
            ProRun <span className="text-emerald-500">LB</span>
          </h1>
          <p className="text-emerald-500/60 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 italic">Performance Integrada</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          {error && (
            <div className="mb-6 bg-red-500/10 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-shake border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-3 ml-1">Atleta / Treinador</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/30 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:ring-1 focus:ring-emerald-500 focus:bg-white/10 outline-none transition text-white font-bold placeholder:text-white/10"
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-3 ml-1">Chave Biométrica</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/30 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="password" 
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:ring-1 focus:ring-emerald-500 focus:bg-white/10 outline-none transition text-white font-bold placeholder:text-white/10"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 uppercase italic tracking-widest text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Acessar Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
           <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
              {isCloudConnected ? (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-emerald-500/70 tracking-widest">Global Network Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-amber-500/70 tracking-widest">Secure Local Storage</span>
                </div>
              )}
           </div>
           <p className="text-[9px] text-white/20 uppercase font-black tracking-[0.4em]">© 2025 LB Performance Systems</p>
        </div>
      </div>
    </div>
  );
}
