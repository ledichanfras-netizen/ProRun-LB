
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import Offline from './pages/Offline';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import Assessments from './pages/Assessments';
import Library from './pages/Library';
import Periodization from './pages/Periodization';
import AthletePortal from './pages/AthletePortal';
import Subscriptions from './pages/Subscriptions';
import SplashScreen from './components/SplashScreen';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#022c22] p-6 text-center text-white">
          <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/20 mb-8 max-w-md w-full">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Ops! Algo deu errado</h2>
            <p className="text-slate-400 text-sm font-medium italic mb-6">
              Ocorreu um erro técnico inesperado ao renderizar este módulo. Nossa equipe foi notificada.
            </p>
            <div className="bg-black/20 p-4 rounded-2xl text-[10px] font-mono text-left opacity-60 overflow-auto max-h-32 mb-6">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 text-emerald-950 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-lg shadow-emerald-500/20"
            >
              RECARREGAR APLICATIVO
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <SplashScreen />
        <Router>
          <AppContent />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
