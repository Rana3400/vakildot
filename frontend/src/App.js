import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

import Welcome from '@/pages/Welcome';
import SignIn from '@/pages/SignIn';
import LawyerOnboarding from '@/pages/LawyerOnboarding';
import ClientOnboarding from '@/pages/ClientOnboarding';
import LawyerDashboard from '@/pages/LawyerDashboard';
import ClientDashboard from '@/pages/ClientDashboard';
import Cases from '@/pages/Cases';
import CaseDetail from '@/pages/CaseDetail';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Documents from '@/pages/Documents';
import Calendar from '@/pages/Calendar';
import Billing from '@/pages/Billing';
import Settings from '@/pages/Settings';
import Layout from '@/components/Layout';
import Wallet from '@/pages/Wallet';
import ConsultationRoom from '@/pages/ConsultationRoom';
import AssetRecovery from '@/pages/AssetRecovery';
import AdminPanel from '@/pages/AdminPanel';
import CallHistory from '@/pages/CallHistory';

function App() {
  const [token, setToken] = useState(localStorage.getItem('vakildot_token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('vakildot_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('vakildot_token', newToken);
    localStorage.setItem('vakildot_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('vakildot_token');
    localStorage.removeItem('vakildot_user');
    setToken(null);
    setUser(null);
  };

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/" />;
  };

  const userRole = user?.user_role || 'lawyer';
  const isClient = userRole === 'client';

  // Determine default dashboard based on role
  const getDefaultDashboard = () => {
    if (!token) return '/';
    return isClient ? '/client-dashboard' : '/lawyer-dashboard';
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={token ? <Navigate to={getDefaultDashboard()} /> : <Welcome />} />
        <Route path="/signin" element={token ? <Navigate to={getDefaultDashboard()} /> : <SignIn onLogin={handleLogin} />} />
        <Route path="/signup/lawyer" element={token ? <Navigate to="/lawyer-dashboard" /> : <LawyerOnboarding onComplete={handleLogin} />} />
        <Route path="/signup/client" element={token ? <Navigate to="/client-dashboard" /> : <ClientOnboarding onComplete={handleLogin} />} />
        <Route path="/asset-recovery" element={<AssetRecovery />} />
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* Protected Routes with Layout */}
        <Route path="/" element={<PrivateRoute><Layout user={user} onLogout={handleLogout} /></PrivateRoute>}>
          {/* Role-Specific Dashboards */}
          <Route path="lawyer-dashboard" element={
            isClient ? <Navigate to="/client-dashboard" /> : <LawyerDashboard />
          } />
          <Route path="client-dashboard" element={
            !isClient ? <Navigate to="/lawyer-dashboard" /> : <ClientDashboard />
          } />
          
          {/* Legacy dashboard route - redirect based on role */}
          <Route path="dashboard" element={<Navigate to={getDefaultDashboard()} />} />
          
          {/* Common Routes */}
          <Route path="cases" element={<Cases userRole={userRole} />} />
          <Route path="cases/:caseId" element={<CaseDetail userRole={userRole} />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="call-history" element={<CallHistory />} />
          <Route path="consultation/:lawyerId" element={<ConsultationRoom />} />
          <Route path="settings" element={<Settings user={user} />} />
          
          {/* LAWYER-ONLY Routes - Clients BLOCKED */}
          <Route path="clients" element={isClient ? <Navigate to="/client-dashboard" /> : <Clients />} />
          <Route path="clients/:clientId" element={isClient ? <Navigate to="/client-dashboard" /> : <ClientDetail />} />
          <Route path="documents" element={isClient ? <Navigate to="/client-dashboard" /> : <Documents />} />
          <Route path="calendar" element={isClient ? <Navigate to="/client-dashboard" /> : <Calendar />} />
          <Route path="billing" element={isClient ? <Navigate to="/client-dashboard" /> : <Billing />} />
        </Route>
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to={getDefaultDashboard()} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
