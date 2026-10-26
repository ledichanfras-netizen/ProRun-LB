
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  LibraryBig,
  CalendarDays, 
  Menu,
  X,
  TrendingUp,
  UserCheck,
  LogOut,
  Cloud,
  CloudOff,
  CreditCard,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import NotificationPrompt from './NotificationPrompt';
import NotificationCenter from './NotificationCenter';
import { AthleteSelectorModal } from './AthleteSelectorModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAthleteSelectorOpen, setIsAthleteSelectorOpen] = useState(false);
  const { athletes, selectedAthleteId, setSelectedAthleteId, userRole, logout, isCloudConnected, notifications, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter(n => !n.read).length;

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

  // Define navigation based on Role
  const navItems = userRole === 'coach' 
    ? [
        { to: '/', icon: LayoutDashboard, label: 'Painel Geral' },
        { to: '/athletes', icon: Users, label: 'Meus Atletas' },
        { to: '/assessments', icon: Activity, label: 'Avaliações' },
        { to: '/library', icon: LibraryBig, label: 'Biblioteca' },
        { to: '/periodization', icon: CalendarDays, label: 'Prescrição' },
        { to: '/athlete-portal', icon: UserCheck, label: 'Visualizar Treino' },
        { to: '/subscriptions', icon: CreditCard, label: 'Assinatura' },
      ]
    : [
        { to: '/', icon: LayoutDashboard, label: 'Meu Painel' },
        { to: '/profile', icon: UserCheck, label: 'Meu Perfil' },
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
    <div className="h-full bg-[#020617] flex flex-col md:flex-row font-sans text-slate-100 overflow-hidden overscroll-none">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#020617]/80 dark:bg-[#020617]/80 backdrop-blur-md text-white p-4 flex justify-between items-center sticky top-0 z-20 border-b border-white/5 no-print safe-top">
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 logo-box bg-[#020617] rounded-xl p-0 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center overflow-hidden">
            <img src="/logo.png?v=11" alt="Logo" className="w-full h-full object-cover rounded-[0.7rem]" referrerPolicy="no-referrer" />
          </div>
          <span className="font-black text-lg tracking-tighter italic uppercase">ProRun <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500">LB</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme} 
            className="p-2 bg-white/10 dark:bg-white/5 hover:bg-white/20 rounded-xl transition-all border border-white/10 flex items-center justify-center text-emerald-400"
            title={theme === 'dark' ? "Ativar Modo Claro Elite" : "Ativar Modo Escuro"}
            aria-label="Alternar Modo Claro/Escuro"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-emerald-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          </button>
          <button onClick={() => setIsNotificationsOpen(true)} className="relative p-1.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <Bell className="w-6 h-6 text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full border-2 border-[#020617] flex items-center justify-center shadow-lg animate-bounce">
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
        fixed inset-y-0 left-0 z-30 w-72 max-w-[calc(100vw-16px)] bg-[#050810] text-white transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        md:relative md:translate-x-0 flex flex-col border-r border-white/5 no-print
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
      `}>
        <div data-sidebar-header className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 logo-box bg-[#020617] p-0 rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-center overflow-hidden">
              <img src="/logo.png?v=11" alt="Logo" className="w-full h-full object-cover rounded-[0.95rem]" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-xl tracking-tighter italic uppercase leading-none whitespace-nowrap">ProRun <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500">LB</span></h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <p className="text-[10px] text-emerald-300/80 uppercase font-black tracking-wider leading-none whitespace-nowrap">
                  {userRole === 'coach' ? 'Treinador' : 'Aluno'}
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
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTheme} 
              className="p-2 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 text-emerald-400"
              title={theme === 'dark' ? "Ativar Modo Claro Elite" : "Ativar Modo Escuro"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-emerald-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>
            <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 hover:bg-white/5 rounded-xl transition-colors group">
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full border border-[#050810] animate-pulse" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto custom-scrollbar">
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
              <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${location.pathname === item.to ? 'text-white' : 'text-emerald-500/80'}`} />
              <span className="font-black text-xs uppercase italic tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#080d1a]/50">
          {userRole === 'coach' && (
            <div 
              onClick={() => setIsAthleteSelectorOpen(true)}
              className="bg-white/5 hover:bg-white/10 rounded-[1.5rem] p-4 mb-4 border border-white/5 hover:border-emerald-500/30 backdrop-blur-md cursor-pointer transition-all group shadow-sm"
              title="Clique para trocar de aluno rapidamente"
            >
               <div className="flex justify-between items-center mb-2">
                 <p className="text-[9px] text-emerald-400 uppercase font-black tracking-[0.2em] flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   Atleta em Foco
                 </p>
                 <span className="text-[8px] font-black text-emerald-400 group-hover:text-white uppercase tracking-tighter transition-colors bg-emerald-500/15 group-hover:bg-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/30">
                   {selectedAthleteId ? 'TROCAR' : 'ESCOLHER'}
                 </span>
               </div>
               <div className="font-bold text-sm text-white truncate flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="truncate">
                    <span className="truncate block font-black uppercase italic text-xs tracking-tight">
                      {activeAthlete ? activeAthlete.name : 'Selecionar Atleta'}
                    </span>
                    {activeAthlete ? (
                      <span className="text-[10px] text-slate-400 font-medium italic block truncate">
                        {activeAthlete.experience} • VDOT {activeAthlete.metrics?.vdot || '--'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium italic block">
                        Toque para focar em um aluno
                      </span>
                    )}
                  </div>
               </div>
            </div>
          )}
          
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all font-black text-xs uppercase italic tracking-wider text-slate-200 group"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 group-hover:-rotate-12 transition-transform" />
              )}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-tighter not-italic font-bold">
              ELITE
            </span>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all font-black text-xs uppercase italic tracking-wider"
          >
            <LogOut className="w-4 h-4 shrink-0" /><span>Finalizar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 max-w-full overflow-y-auto overscroll-y-contain h-[calc(100vh-64px)] md:h-full bg-[#020617] scroll-smooth">
        <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 pb-32">
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
      <AthleteSelectorModal isOpen={isAthleteSelectorOpen} onClose={() => setIsAthleteSelectorOpen(false)} />
    </div>
  );
};

export default Layout;
