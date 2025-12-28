
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import Assessments from './pages/Assessments';
import Library from './pages/Library';
import Periodization from './pages/Periodization';
import AthletePortal from './pages/AthletePortal';
import Login from './pages/Login';

/**
 * AppContent gerencia o roteamento e o estado de carregamento global.
 * Utiliza o useApp para acessar a role do usuário e dados sincronizados do Firebase.
 */
function AppContent() {
  const { userRole, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black text-xl tracking-tighter uppercase italic">LB SPORTS</span>
        <span className="mt-2 text-slate-400 text-sm">Carregando plataforma profissional...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {userRole ? (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/library" element={<Library />} />
            <Route path="/periodization" element={<Periodization />} />
            <Route path="/athlete-portal" element={<AthletePortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
