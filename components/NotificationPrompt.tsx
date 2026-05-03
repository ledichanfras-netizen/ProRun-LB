import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

const NotificationPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    // Se o usuário ainda não decidiu e estamos em um ambiente que suporta notificações
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Mostra após 5 segundos no app
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    setShowPrompt(false);
    
    if (result === 'granted') {
      console.log('Notificações autorizadas!');
      // Aqui você registraria o token no backend (Supabase)
    }
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-fade-in-up">
      <div className="bg-emerald-950 text-white p-6 rounded-[2rem] shadow-2xl border border-emerald-800 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Bell className="w-6 h-6 text-emerald-950" />
          </div>
          <button onClick={() => setShowPrompt(false)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div>
          <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Não perca o treino!</h3>
          <p className="text-xs text-emerald-100/60 font-medium italic mt-1 leading-relaxed">
            Ative as notificações para receber lembretes de treinos e mensagens do seu treinador diretamente no seu celular.
          </p>
        </div>

        <div className="flex gap-3 mt-2">
          <button 
            onClick={requestPermission}
            className="flex-1 bg-white text-emerald-950 font-black py-3 rounded-xl uppercase italic tracking-tighter text-xs shadow-lg hover:bg-emerald-50 transition-all"
          >
            Ativar Agora
          </button>
          <button 
            onClick={() => setShowPrompt(false)}
            className="flex-1 bg-emerald-900/50 text-emerald-400 font-black py-3 rounded-xl uppercase italic tracking-tighter text-xs"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
