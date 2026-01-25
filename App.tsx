
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';

// Lazy loading das páginas para performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Athletes = lazy(() => import('./pages/Athletes'));
const Assessments = lazy(() => import('./pages/Assessments'));
const Library = lazy(() => import('./pages/Library'));
const Periodization = lazy(() => import('./pages/Periodization'));
const AthletePortal = lazy(() => import('./pages/AthletePortal'));
const Login = lazy(() => import('./pages/Login'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <span className="font-black text-xs tracking-widest text-slate-400 uppercase italic">Carregando Módulos...</span>
  </div>
);

function AppContent() {
  const { userRole, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-emerald-950 text-white">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="font-black text-xl tracking-tighter uppercase italic">PRORUN LB</span>
        <span className="mt-2 text-emerald-300/60 text-[10px] font-black uppercase tracking-widest">Sincronizando Performance...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
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
      </Suspense>
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
