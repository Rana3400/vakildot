import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
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
  const [lawyer, setLawyer] = useState(null);

  useEffect(() => {
    if (token) {
      const storedLawyer = localStorage.getItem('vakildesk_lawyer');
      if (storedLawyer) {
        setLawyer(JSON.parse(storedLawyer));
      }
    }
  }, [token]);

  const handleLogin = (newToken, lawyerData) => {
    localStorage.setItem('vakildesk_token', newToken);
    localStorage.setItem('vakildesk_lawyer', JSON.stringify(lawyerData));
    setToken(newToken);
    setLawyer(lawyerData);
  };

  const handleLogout = () => {
    localStorage.removeItem('vakildesk_token');
    localStorage.removeItem('vakildesk_lawyer');
    setToken(null);
    setLawyer(null);
  };

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/onboarding" element={<Onboarding onComplete={handleLogin} />} />
        
        <Route path="/" element={<PrivateRoute><Layout lawyer={lawyer} onLogout={handleLogout} /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/:caseId" element={<CaseDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:clientId" element={<ClientDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings" element={<Settings lawyer={lawyer} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;