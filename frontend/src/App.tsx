import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { LoadingOverlay } from '@mantine/core';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import ImportInvoices from './pages/ImportInvoices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay visible />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay visible />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <TimerProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/import/invoices" element={<ImportInvoices />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </TimerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
