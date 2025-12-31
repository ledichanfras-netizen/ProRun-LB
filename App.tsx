
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Route-based code splitting: lazy-load page components to reduce initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Athletes = lazy(() => import('./pages/Athletes'));
const Assessments = lazy(() => import('./pages/Assessments'));
const Library = lazy(() => import('./pages/Library'));
const Periodization = lazy(() => import('./pages/Periodization'));
const AthletePortal = lazy(() => import('./pages/AthletePortal'));
const Login = lazy(() => import('./pages/Login'));

import { AppProvider, useApp } from './context/AppContext';

// Simple Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { userRole } = useApp();
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/athletes" element={<ProtectedRoute><Layout><Athletes /></Layout></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute><Layout><Assessments /></Layout></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><Layout><Library /></Layout></ProtectedRoute>} />
      <Route path="/periodization" element={<ProtectedRoute><Layout><Periodization /></Layout></ProtectedRoute>} />
      <Route path="/athlete-portal" element={<ProtectedRoute><Layout><AthletePortal /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Suspense fallback={<div className="p-8">Carregando...</div>}>
          <AppRoutes />
        </Suspense>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
