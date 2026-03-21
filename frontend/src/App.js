import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

// Eagerly load critical pages (first-paint)
import Welcome from '@/pages/Welcome';
import SignIn from '@/pages/SignIn';

// Lazy load everything else for performance
const LawyerOnboarding = lazy(() => import('@/pages/LawyerOnboarding'));
const ClientOnboarding = lazy(() => import('@/pages/ClientOnboarding'));
const LawyerDashboard = lazy(() => import('@/pages/LawyerDashboard'));
const ClientDashboard = lazy(() => import('@/pages/ClientDashboard'));
const Cases = lazy(() => import('@/pages/Cases'));
const CaseDetail = lazy(() => import('@/pages/CaseDetail'));
const Clients = lazy(() => import('@/pages/Clients'));
const ClientDetail = lazy(() => import('@/pages/ClientDetail'));
const Documents = lazy(() => import('@/pages/Documents'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Billing = lazy(() => import('@/pages/Billing'));
const Settings = lazy(() => import('@/pages/Settings'));
const Layout = lazy(() => import('@/components/Layout'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const ConsultationRoom = lazy(() => import('@/pages/ConsultationRoom'));
const AssetRecovery = lazy(() => import('@/pages/AssetRecovery'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const CallHistory = lazy(() => import('@/pages/CallHistory'));

import PWAInstallBanner from '@/components/PWAInstallBanner';

// Minimal loading spinner
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#FAF9F6]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[#1a1a2e] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  </div>
);

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

  const userRole = user?.user_role || user?.role || 'lawyer';
  const isClient = userRole === 'client';

  const getDefaultDashboard = () => {
    if (!token) return '/';
    return isClient ? '/client-dashboard' : '/lawyer-dashboard';
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <PWAInstallBanner />
      <Suspense fallback={<PageLoader />}>
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
            <Route path="lawyer-dashboard" element={
              isClient ? <Navigate to="/client-dashboard" /> : <LawyerDashboard />
            } />
            <Route path="client-dashboard" element={
              !isClient ? <Navigate to="/lawyer-dashboard" /> : <ClientDashboard />
            } />
            <Route path="dashboard" element={<Navigate to={getDefaultDashboard()} />} />
            <Route path="cases" element={<Cases userRole={userRole} />} />
            <Route path="cases/:caseId" element={<CaseDetail userRole={userRole} />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="call-history" element={<CallHistory />} />
            <Route path="consultation/:lawyerId" element={<ConsultationRoom />} />
            <Route path="settings" element={<Settings user={user} />} />
            <Route path="clients" element={isClient ? <Navigate to="/client-dashboard" /> : <Clients />} />
            <Route path="clients/:clientId" element={isClient ? <Navigate to="/client-dashboard" /> : <ClientDetail />} />
            <Route path="documents" element={isClient ? <Navigate to="/client-dashboard" /> : <Documents />} />
            <Route path="calendar" element={isClient ? <Navigate to="/client-dashboard" /> : <Calendar />} />
            <Route path="billing" element={isClient ? <Navigate to="/client-dashboard" /> : <Billing />} />
          </Route>
          
          <Route path="*" element={<Navigate to={getDefaultDashboard()} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
