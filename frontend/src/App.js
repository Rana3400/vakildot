import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

import Welcome from '@/pages/Welcome';
import Login from '@/pages/Login';
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

function App() {
  const [token, setToken] = useState(localStorage.getItem('vakildesk_token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('vakildesk_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('vakildesk_token', newToken);
    localStorage.setItem('vakildesk_user', JSON.stringify(userData));
    // Also keep old key for backward compatibility
    localStorage.setItem('vakildesk_lawyer', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('vakildesk_token');
    localStorage.removeItem('vakildesk_user');
    localStorage.removeItem('vakildesk_lawyer');
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
        <Route path="/login/:userType" element={token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/onboarding/lawyer" element={<LawyerOnboarding onComplete={handleLogin} />} />
        <Route path="/onboarding/client" element={<ClientOnboarding onComplete={handleLogin} />} />
        
        <Route path="/" element={<PrivateRoute><Layout user={user} onLogout={handleLogout} /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard userRole={userRole} />} />
          <Route path="cases" element={<Cases userRole={userRole} />} />
          <Route path="cases/:caseId" element={<CaseDetail userRole={userRole} />} />
          
          {/* Only lawyers can access these routes */}
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;