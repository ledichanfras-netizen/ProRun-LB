
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  BookOpen, 
  CalendarDays, 
  Menu,
  X,
  TrendingUp,
  UserCheck,
  LogOut,
  Cloud,
  CloudOff,
  CreditCard,
  Bell
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import NotificationPrompt from './NotificationPrompt';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const { athletes, selectedAthleteId, setSelectedAthleteId, userRole, logout, isCloudConnected, notifications } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setShowInstallBanner(true);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });
  }, []);
  
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

  // Define navigation based on Role
  const navItems = userRole === 'coach' 
    ? [
        { to: '/', icon: LayoutDashboard, label: 'Painel Geral' },
        { to: '/athletes', icon: Users, label: 'Meus Atletas' },
        { to: '/assessments', icon: Activity, label: 'Avaliações' },
        { to: '/library', icon: BookOpen, label: 'Biblioteca' },
        { to: '/periodization', icon: CalendarDays, label: 'Prescrição' },
        { to: '/athlete-portal', icon: UserCheck, label: 'Visualizar Treino' },
        { to: '/subscriptions', icon: CreditCard, label: 'Assinatura' },
      ]
    : [
        { to: '/', icon: LayoutDashboard, label: 'Meu Painel' },
        { to: '/athlete-portal', icon: UserCheck, label: 'Meu Treino' },
        { to: '/assessments', icon: Activity, label: 'Minhas Zonas' },
        { to: '/subscriptions', icon: CreditCard, label: 'Assinatura' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!userRole) return <>{children}</>;

  return (
    <div className="h-full bg-[#020617] flex flex-col md:flex-row font-sans text-slate-100 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#020617]/80 backdrop-blur-md text-white p-4 flex justify-between items-center sticky top-0 z-20 border-b border-white/5 no-print safe-top">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 rounded-lg p-1 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-lg tracking-tighter italic uppercase">ProRun <span className="text-emerald-500">LB</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsNotificationsOpen(true)} className="relative p-1">
            <Bell className="w-6 h-6 text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full border border-[#020617] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-[#050810] text-white transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        md:relative md:translate-x-0 flex flex-col border-r border-white/5 no-print
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="bg-white p-1.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
             <img src="/prorunlb_android_192.png?v=6" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="font-black text-2xl tracking-tighter italic uppercase leading-none">ProRun <span className="text-emerald-500">LB</span></h1>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-emerald-300/80 uppercase font-black tracking-[0.2em] leading-none">
                {userRole === 'coach' ? 'Coach' : 'Athlete'}
              </p>
              {isCloudConnected ? (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] translate-x-2' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${location.pathname === item.to ? 'text-white' : 'text-emerald-500/80'}`} />
              <span className="font-black text-xs uppercase italic tracking-widest">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#080d1a]/50">
          {userRole === 'coach' && (
            <div className="bg-white/5 rounded-[1.5rem] p-4 mb-4 border border-white/5 backdrop-blur-md">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-[9px] text-emerald-400 uppercase font-black tracking-[0.2em]">Atleta em Foco</p>
                 {selectedAthleteId && (
                   <button 
                     onClick={() => setSelectedAthleteId(null)}
                     className="text-[8px] font-black text-emerald-400/60 hover:text-white uppercase tracking-tighter transition-colors"
                   >
                     TROCAR
                   </button>
                 )}
               </div>
               <div className="font-bold text-sm text-white truncate flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="truncate">{activeAthlete ? activeAthlete.name : 'Nenhum atleta'}</span>
               </div>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all font-black text-xs uppercase italic tracking-[0.2em]"
          >
            <LogOut className="w-4 h-4" /> Finalizar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-full bg-[#020617] scroll-smooth">
        <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 pb-32">
          {showInstallBanner && (
            <div id="install-area" className="relative overflow-hidden glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 no-print animate-fade-in group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="bg-white p-1 rounded-[1.5rem] shadow-2xl border border-white/10 overflow-hidden transform group-hover:rotate-6 transition-transform">
                  <img src="/prorunlb_android_192.png?v=6" alt="ProRun Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-black text-2xl text-white uppercase italic tracking-tighter mb-1">Experiência Completa</p>
                  <p className="text-sm text-slate-400 font-medium italic">
                    {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream 
                      ? "Toque em Compartilhar e depois em 'Adicionar à Tela de Início'." 
                      : "Instale o app e tenha acesso instantâneo às suas métricas."}
                  </p>
                </div>
              </div>
              {!/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                <button 
                  onClick={() => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then((choiceResult: any) => {
                        if (choiceResult.outcome === 'accepted') {
                          setShowInstallBanner(false);
                        }
                      });
                    }
                  }}
                  className="relative z-10 bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase italic tracking-[0.2em] shadow-[0_15px_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                  <TrendingUp className="w-4 h-4" /> Baixar App Premium
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden no-print backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <NotificationPrompt />
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
};

export default Layout;
