
import React from 'react';
import { Check, Zap, Star, Shield, CreditCard, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const Subscriptions: React.FC = () => {
  const { hasActiveSubscription, userRole } = useApp();

  const plans = [
    {
      name: 'Mensal',
      price: 'R$ 89,90',
      period: '/mês',
      features: [
        'Planilha Individualizada',
        'Cálculo de Paces VDOT',
        'Portal do Atleta PWA',
        'Análise de PSE pelo Coach'
      ],
      highlight: false,
      buttonText: 'Assinar Mensal'
    },
    {
      name: 'Anual',
      price: 'R$ 69,90',
      period: '/mês',
      features: [
        'Tudo do Mensal',
        'Análise de Biofeedback IA',
        'Gráficos de Performance',
        'Prioridade no Suporte',
        'Economia de 22%'
      ],
      highlight: true,
      buttonText: 'Assinar Plano Anual'
    },
    {
      name: 'Trimestral',
      price: 'R$ 79,90',
      period: '/mês',
      features: [
        'Tudo do Mensal',
        'Análise IA Básica',
        'Exportação de Relatórios',
        'Histórico Ilimitado'
      ],
      highlight: false,
      buttonText: 'Assinar Trimestral'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-fade-in">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Star className="w-3 h-3 fill-current" /> Planos de Performance
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
          Evolua como um Pró
        </h1>
        <p className="text-slate-500 font-medium max-w-xl mx-auto italic text-sm">
          Escolha o plano ideal para seus objetivos de corrida. Performance integrada com ciência e tecnologia.
        </p>
      </header>

      {hasActiveSubscription && userRole === 'athlete' && (
        <div className="bg-emerald-950 text-white p-6 rounded-[2rem] shadow-xl border border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl">
              <Shield className="w-6 h-6 text-emerald-950" />
            </div>
            <div>
              <p className="font-black uppercase italic tracking-tighter text-emerald-400">Assinatura Ativa</p>
              <p className="text-xs text-emerald-100/60 font-medium">Você tem acesso total a todas as ferramentas ProRun.</p>
            </div>
          </div>
          <button className="text-[10px] font-black uppercase italic tracking-widest text-emerald-400 hover:text-emerald-300">
            Gerenciar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div 
            key={i} 
            className={`relative bg-white rounded-[2.5rem] p-8 border-2 transition-all hover:scale-[1.02] flex flex-col ${
              plan.highlight 
                ? 'border-emerald-500 shadow-2xl shadow-emerald-500/10' 
                : 'border-slate-100 shadow-sm'
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-emerald-950 text-[9px] font-black px-4 py-1.5 rounded-full uppercase italic tracking-widest shadow-lg">
                Mais Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                <span className="text-slate-400 text-xs font-bold uppercase italic">{plan.period}</span>
              </div>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3 stroke-[3px]" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 italic">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                plan.highlight 
                  ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900 text-white hover:bg-black'
              }`}
            >
              <CreditCard className="w-4 h-4" /> {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 border border-slate-100">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-shrink-0">
          <Zap className="w-10 h-10 text-amber-500 fill-current" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Para sua Assessoria?</h3>
          <p className="text-slate-500 text-sm font-medium italic">
            Temos condições especiais para treinadores e assessorias esportivas com mais de 20 atletas. Ganhe controle total sobre o desempenho do seu time.
          </p>
        </div>
        <button className="whitespace-nowrap flex items-center gap-2 text-emerald-600 font-black uppercase italic tracking-widest text-[10px] hover:gap-4 transition-all">
          CONSULTAR WHATSAPP <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Subscriptions;
