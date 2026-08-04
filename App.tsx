
import React, { Component, ErrorInfo, ReactNode, Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Common pages always available
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Offline from './pages/Offline';

// Lazy loading secondary pages
const Athletes = lazy(() => import('./pages/Athletes'));
const Assessments = lazy(() => import('./pages/Assessments'));
const Library = lazy(() => import('./pages/Library'));
const Periodization = lazy(() => import('./pages/Periodization'));
const AthletePortal = lazy(() => import('./pages/AthletePortal'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
// ... existing constructor and methods ...
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 text-center text-white">
          <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/20 mb-8 max-w-md w-full">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Ops! Algo deu errado</h2>
// ... rest of error boundary ...
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

const PageLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <span className="text-[9px] font-black tracking-[0.2em] text-emerald-500/40 uppercase italic">Carregando Módulo...</span>
  </div>
);

function AppContent() {
  const { userRole, isLoading } = useApp();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Check onboarding only for athletes
    if (userRole === 'athlete') {
      const completed = localStorage.getItem('proRun_onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      }
    } else {
      setShowOnboarding(false);
    }
  }, [userRole]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('proRun_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SW Update listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdateToast(true);
              }
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline && !isLoading) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Offline />
      </Suspense>
    );
  }

  if (isLoading && userRole) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#020617] text-white">
        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando ProRun LB</span>
          <span className="text-emerald-500/30 text-[8px] font-bold uppercase tracking-[0.1em]">Aguardando Engine de Performance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {showUpdateToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce-in">
          <div className="bg-emerald-500 text-emerald-950 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center gap-4 border border-white/20">
            <div className="bg-white/20 p-2 rounded-xl">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider">Nova Versão Disponível</span>
              <span className="text-[8px] font-bold opacity-70 uppercase">Melhorias e correções aplicadas</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-emerald-950 text-emerald-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter hover:bg-emerald-900 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={<PageLoading />}>
        {showInstallPrompt && (
          <div className="fixed bottom-4 left-1/2 z-[9999] w-[min(92vw,520px)] -translate-x-1/2 rounded-[2rem] border border-emerald-500/20 bg-[#020617]/95 p-4 shadow-[0_30px_60px_rgba(0,0,0,0.35)] backdrop-blur-lg text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-[#081014] border border-emerald-500/20 p-3 flex items-center justify-center shadow-inner">
                <img src="/logo.png?v=10" alt="ProRun LB" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-sm tracking-[0.24em] text-emerald-300 mb-1">ProRun LB</p>
                <p className="text-[11px] leading-snug text-slate-300">Instale o app para acesso rápido e offline ao seu treino.</p>
              </div>
              <div className="flex items-center gap-2">
                {!/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  <button
                    onClick={() => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult: any) => {
                          if (choiceResult.outcome === 'accepted') {
                            setShowInstallPrompt(false);
                          }
                        });
                      }
                    }}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-950 shadow-lg shadow-emerald-500/20"
                  >
                    Instalar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowInstallPrompt(false);
                    }}
                    className="rounded-2xl border border-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300"
                  >
                    Como instalar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
    <ErrorBoundary>
      <AppProvider>
        <SplashScreen />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
