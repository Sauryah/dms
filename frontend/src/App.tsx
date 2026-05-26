import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import MachineDetails from './pages/MachineDetails';
import SetDetails from './pages/SetDetails';
import SetsPage from './pages/SetsPage';
import DiesPage from './pages/DiesPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import './styles/App.css';

// Lazy load heavy visualization pages to keep the core bundle lightweight and fast
const FleetGraphPage = lazy(() => import('./pages/FleetGraphPage'));
const CodebaseGraphPage = lazy(() => import('./pages/CodebaseGraphPage'));

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container fade-in">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

// Secure administrator-only route pipeline guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-container fade-in">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    const density = localStorage.getItem('ui-density');
    if (density === 'compact') {
      document.body.classList.add('compact-mode');
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main, #f8fafc)', color: 'var(--text-main, #1e293b)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }}></div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Loading View</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Preparing interactive components...</p>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/machines" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/machines/:id" element={<ProtectedLayout><MachineDetails /></ProtectedLayout>} />
              <Route path="/sets" element={<ProtectedLayout><SetsPage /></ProtectedLayout>} />
              <Route path="/sets/:id" element={<ProtectedLayout><SetDetails /></ProtectedLayout>} />
              <Route path="/dies" element={<ProtectedLayout><DiesPage /></ProtectedLayout>} />
              <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
              <Route path="/topology" element={<AdminRoute><FleetGraphPage /></AdminRoute>} />
              <Route path="/codebase" element={<AdminRoute><CodebaseGraphPage /></AdminRoute>} />
              <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
