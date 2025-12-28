
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Dumbbell, 
  TrendingUp, 
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workouts', icon: Dumbbell, label: 'Gerar Treino' },
    { to: '/progress', icon: TrendingUp, label: 'Progresso' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Dumbbell className="text-blue-500" />
          <span className="font-bold text-xl">ProRun LB</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 bg-gray-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 md:w-64 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">ProRun LB</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold truncate">{userData?.name || 'Usuário'}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.role === 'athlete' ? 'Atleta' : 'Treinador'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
