import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import NewPatientPage from './pages/NewPatientPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#161b22', color: '#e6edf3', border: '1px solid #30363d' },
          success: { iconTheme: { primary: '#34c97a', secondary: '#161b22' } },
          error:   { iconTheme: { primary: '#f75959', secondary: '#161b22' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<NewPatientPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
