
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import Assessments from './pages/Assessments';
import Library from './pages/Library';
import Periodization from './pages/Periodization';
import AthletePortal from './pages/AthletePortal';
import Login from './pages/Login';
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
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
