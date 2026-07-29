
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-[#020617] text-white flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Animated background ambient glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -30, 0],
            y: [0, 20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-400/15 rounded-full blur-[140px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 my-auto"
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative mb-5"
          >
            {/* Glowing ring behind logo */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-500/30 to-emerald-400/20 blur-xl opacity-75 animate-pulse" />
            
            <div className="relative w-28 h-28 p-1 logo-box bg-[#020617] rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-emerald-500/40 overflow-hidden transform hover:scale-105 hover:border-emerald-400 transition-all duration-500 flex items-center justify-center">
              <img 
                src="/prorunlb_pwa_192_with_text.png?v=10" 
                alt="ProRun LB" 
                className="w-full h-full object-cover rounded-[1.3rem]" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter uppercase leading-none"
          >
            ProRun <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500">LB</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-emerald-400/80 font-black uppercase tracking-[0.3em] text-[10px] mt-2 italic flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-emerald-400 inline" /> Performance Integrada
          </motion.p>
        </div>

        {/* Login Form Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="bg-slate-900/60 backdrop-blur-2xl border border-emerald-500/20 rounded-[2.5rem] p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-red-500/10 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-500/20 shadow-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2 ml-1">
                Atleta / Treinador
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 w-5 h-5 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  required
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950/60 border border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:bg-slate-950/90 outline-none transition-all duration-300 text-white font-bold placeholder:text-slate-500/60 text-sm"
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2 ml-1">
                Chave Biométrica
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 w-5 h-5 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 bg-slate-950/60 border border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:bg-slate-950/90 outline-none transition-all duration-300 text-white font-bold placeholder:text-slate-500/60 text-sm"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-400 transition-colors focus:outline-none p-1 flex items-center justify-center rounded-lg"
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button 
              type="submit" 
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black py-4 sm:py-5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 uppercase italic tracking-widest text-xs cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase text-emerald-300 tracking-widest">
                {isCloudConnected ? "Global Network Connected" : "Secure Local Storage"}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.35em]">
            © 2025 LB Performance Systems
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

