
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell, User, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(formData.email, formData.password, { name: formData.name });
      navigate('/');
    } catch (err: any) {
      setError("Erro ao criar conta. Verifique os dados e tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fade-in-up">
        <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold text-sm mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Login
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-500 p-3 rounded-2xl shadow-lg shadow-green-500/30 mb-4">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Nova Conta</h1>
          <p className="text-gray-500 font-medium">Comece sua jornada hoje</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Seu nome"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="email@dominio.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Senha</label>
              <input 
                type="password" required
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar</label>
              <input 
                type="password" required
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="••••"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/30 mt-4 transition"
          >
            {loading ? 'Criando Conta...' : 'Registrar Agora'}
          </button>
        </form>
      </div>
    </div>
  );
}
