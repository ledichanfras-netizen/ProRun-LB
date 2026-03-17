
import React, { useState } from 'react';
import { Moon, Zap, Activity, Smile, Coffee, Send } from 'lucide-react';
import { WellnessData } from '../../types';

interface WellnessFormProps {
  onSubmit: (data: WellnessData) => void;
}

export const WellnessForm: React.FC<WellnessFormProps> = ({ onSubmit }) => {
  const [data, setData] = useState<Omit<WellnessData, 'date'>>({
    sleep: 3,
    stress: 3,
    soreness: 3,
    fatigue: 3,
    mood: 3
  });

  const metrics = [
    { key: 'sleep', label: 'Qualidade do Sono', icon: Moon, color: 'text-blue-500' },
    { key: 'fatigue', label: 'Nível de Fadiga', icon: Zap, color: 'text-amber-500' },
    { key: 'stress', label: 'Nível de Estresse', icon: Coffee, color: 'text-purple-500' },
    { key: 'soreness', label: 'Dor Muscular', icon: Activity, color: 'text-red-500' },
    { key: 'mood', label: 'Estado de Humor', icon: Smile, color: 'text-emerald-500' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...data,
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <div className="mb-8">
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Check-in Diário</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Como você se sente hoje?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-4">
              <div className="flex items-center gap-2">
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">{metric.label}</label>
              </div>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, [metric.key]: val }))}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                      data[metric.key as keyof typeof data] === val
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>Péssimo</span>
                <span>Excelente</span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
        >
          <Send className="w-4 h-4" /> Enviar Wellness
        </button>
      </form>
    </div>
  );
};
