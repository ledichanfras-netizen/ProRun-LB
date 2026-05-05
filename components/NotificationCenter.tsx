import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Trash2, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, removeNotification } = useApp();
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleAction = (id: string, link: string) => {
    markAsRead(id);
    navigate(link);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end p-4 md:p-6 pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col pointer-events-auto animate-fade-in-right overflow-hidden border border-white/5">
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Notificações</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-[1.5rem] border-2 transition-all group relative ${
                  n.read ? 'bg-white/5 border-white/5 opacity-50' : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                }`}
              >
                {!n.read && (
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse"></div>
                )}
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-black text-white uppercase italic tracking-tight">{n.title}</h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium italic mb-3 line-clamp-2">
                      {n.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-500 uppercase">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={() => handleAction(n.id, n.link)}
                        className={`text-[9px] font-black uppercase italic tracking-widest flex items-center gap-1 transition-all ${
                          n.read ? 'text-slate-500 opacity-0 group-hover:opacity-100' : 'text-emerald-400 hover:gap-2'
                        }`}
                      >
                        RESOLVER <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <Bell className="w-16 h-16 text-white/5 mb-4" />
               <p className="text-slate-500 font-black uppercase italic text-xs tracking-widest">Nada de novo por aqui.</p>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-white/5 bg-white/5 flex justify-center">
           <button 
             onClick={onClose}
             className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest hover:text-white transition-colors"
           >
             Fechar Central
           </button>
        </footer>
      </div>
    </div>
  );
};

export default NotificationCenter;
