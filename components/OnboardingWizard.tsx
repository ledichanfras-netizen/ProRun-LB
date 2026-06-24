
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Activity, 
  Zap, 
  ChevronRight, 
  X, 
  PlayCircle,
  BarChart3,
  Sparkles,
  CalendarDays,
  ListOrdered
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Bem-vindo ao Time ProRun LB",
    description: "Você acaba de entrar para a elite da performance. O ProRun LB não é apenas um app de treinos, é o seu centro de inteligência técnica para corrida.",
    icon: <Trophy className="w-12 h-12 text-amber-500" />,
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=800",
    color: "from-amber-500/20 to-emerald-500/20"
  },
  {
    title: "O Propósito: Ciência e Resultados",
    description: "Nossa metodologia foca em periodização estratégica. Cada treino tem um objetivo claro: evoluir seu VDOT, controlar sua carga e garantir que você chegue na prova na sua melhor forma.",
    icon: <Activity className="w-12 h-12 text-emerald-500" />,
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-500/20 to-blue-500/20"
  },
  {
    title: "Sua Central de Performance",
    description: "No 'Portal do Atleta', você encontrará seu ciclo atual, metas semanais e ritmos calculados especificamente para o seu nível técnico.",
    icon: <BarChart3 className="w-12 h-12 text-blue-500" />,
    image: "https://images.unsplash.com/photo-1530141943419-f470a9eb639b?auto=format&fit=crop&q=80&w=800",
    color: "from-blue-500/20 to-purple-500/20"
  },
  {
    title: "Precisão em Cada Movimento",
    description: "Pronto para o próximo nível? Em sessões específicas, você terá o detalhamento de cada exercício, séries e cargas sugeridas. Ajuste em tempo real conforme sua performance.",
    icon: <ListOrdered className="w-12 h-12 text-purple-500" />,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
    color: "from-purple-500/20 to-amber-500/20"
  },
  {
    title: "A Importância da Execução",
    description: "Dar o 'Check' no treino e enviar seu feedback é vital. Isso alimenta nossa IA para que o Coach possa ajustar sua planilha e garantir que você não entre em overtraining.",
    icon: <Zap className="w-12 h-12 text-amber-500" />,
    image: "https://images.unsplash.com/photo-1594882645126-14020914d58d?auto=format&fit=crop&q=80&w=800",
    color: "from-amber-500/20 to-red-500/20"
  },
  {
    title: "Pronto para Começar?",
    description: "Defina suas metas, siga os ritmos e confie no processo. Seu próximo Recorde Pessoal começa agora. Vamos pra cima!",
    icon: <Sparkles className="w-12 h-12 text-emerald-500" />,
    image: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-500/20 to-amber-500/20"
  }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { userRole } = useApp();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${steps[currentStep].color} opacity-50`} />
        
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative h-48 md:h-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentStep}
                src={steps[currentStep].image}
                alt={steps[currentStep].title}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full object-cover grayscale-[20%] sepia-[10%] brightness-75"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:hidden" />
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-12 flex flex-col justify-center min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 p-4 bg-white/5 rounded-3xl w-fit inline-block">
                  {steps[currentStep].icon}
                </div>
                
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-tight">
                  {steps[currentStep].title}
                </h2>
                
                <p className="text-slate-400 font-medium italic text-lg leading-relaxed mb-8">
                  {steps[currentStep].description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-2">
                {steps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-emerald-500' : 'w-2 bg-white/10'}`}
                  />
                ))}
              </div>

              <button 
                onClick={handleNext}
                className="bg-emerald-500 text-emerald-950 px-8 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all flex items-center gap-2 group"
              >
                {currentStep === steps.length - 1 ? 'VAMOS COMEÇAR' : 'PRÓXIMO'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
