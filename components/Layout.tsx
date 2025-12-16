
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { athletes, selectedAthleteId, userRole, logout } = useApp();
  const navigate = useNavigate();
  
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
      ]
    : [
        { to: '/', icon: LayoutDashboard, label: 'Meu Painel' },
        { to: '/athlete-portal', icon: UserCheck, label: 'Meu Treino' },
        { to: '/assessments', icon: Activity, label: 'Minhas Zonas' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!userRole) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-lg no-print">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <span className="font-bold text-lg">ProRun</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 flex flex-col shadow-2xl no-print
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-blue-800">
          <div className="bg-green-500 p-2 rounded-lg">
             <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">ProRun</h1>
            <p className="text-xs text-blue-200 uppercase tracking-wider">
              {userRole === 'coach' ? 'Área do Treinador' : 'Área do Atleta'}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-blue-700 text-white shadow-lg border-l-4 border-green-400' 
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800 bg-blue-950/30">
          {userRole === 'coach' && (
            <div className="bg-blue-800/50 rounded-lg p-3 mb-3 border border-blue-700/50">
               <p className="text-xs text-blue-200 mb-1 uppercase font-bold">Atleta Selecionado</p>
               <div className="font-medium text-white truncate flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-400" />
                  {activeAthlete ? activeAthlete.name : 'Nenhum'}
               </div>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-200 hover:text-white hover:bg-red-900/50 rounded transition"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
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
    </div>
  );
};

export default Layout;
