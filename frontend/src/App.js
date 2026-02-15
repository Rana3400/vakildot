import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

import Welcome from '@/pages/Welcome';
import SignIn from '@/pages/SignIn';
import LawyerOnboarding from '@/pages/LawyerOnboarding';
import ClientOnboarding from '@/pages/ClientOnboarding';
import Dashboard from '@/pages/Dashboard';
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

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Welcome />} />
        <Route path="/signin" element={token ? <Navigate to="/dashboard" /> : <SignIn onLogin={handleLogin} />} />
        <Route path="/signup/lawyer" element={token ? <Navigate to="/dashboard" /> : <LawyerOnboarding onComplete={handleLogin} />} />
        <Route path="/signup/client" element={token ? <Navigate to="/dashboard" /> : <ClientOnboarding onComplete={handleLogin} />} />
        
        <Route path="/" element={<PrivateRoute><Layout user={user} onLogout={handleLogout} /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard userRole={userRole} />} />
          <Route path="cases" element={<Cases userRole={userRole} />} />
          <Route path="cases/:caseId" element={<CaseDetail userRole={userRole} />} />
          {userRole === 'lawyer' && (
            <>
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:clientId" element={<ClientDetail />} />
              <Route path="documents" element={<Documents />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="billing" element={<Billing />} />
            </>
          )}
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;