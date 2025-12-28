
import React from 'react';
import { TrendingUp, Scale, Zap, Target } from 'lucide-react';

export default function ProgressTracking() {
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900">Meu Progresso</h1>
        <p className="text-gray-500">Métricas de performance e evolução física.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Scale className="text-blue-500" /> Evolução de Peso
          </h2>
          <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-medium italic">
            Gráfico de evolução em breve...
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="text-yellow-500" /> Cargas Máximas (1RM)
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="font-bold">Agachamento Livre</span>
              <span className="text-blue-600 font-black">95 kg</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="font-bold">Supino Reto</span>
              <span className="text-blue-600 font-black">72 kg</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="font-bold">Levantamento Terra</span>
              <span className="text-blue-600 font-black">120 kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
