
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import Offline from './pages/Offline';
import Login from './pages/Login';
import SplashScreen from './components/SplashScreen';

// Lazy loading das páginas para performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Athletes = lazy(() => import('./pages/Athletes'));
const Assessments = lazy(() => import('./pages/Assessments'));
const Library = lazy(() => import('./pages/Library'));
const Periodization = lazy(() => import('./pages/Periodization'));
const AthletePortal = lazy(() => import('./pages/AthletePortal'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#022c22]">
    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <span className="text-[8px] font-black tracking-[0.3em] text-emerald-500/40 uppercase italic">Iniciando Engine...</span>
  </div>
);

function AppContent() {
  const { userRole, isLoading } = useApp();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline && !isLoading) {
    return <Offline />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#022c22] text-white">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-emerald-500/60 text-[9px] font-black uppercase tracking-[0.2em]">Sincronizando Dados</span>
      </div>
    );
  }

  return (
    <div className="h-full">
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
              <Route path="/subscriptions" element={<Subscriptions />} />
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
      <SplashScreen />
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
