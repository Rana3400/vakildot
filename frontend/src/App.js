import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

// Firebase Imports
import { auth } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

// Pages & Components
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

function App() {
  const [token, setToken] = useState(localStorage.getItem('vakildot_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth Listener to sync with Firestore Rules
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = localStorage.getItem('vakildot_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setToken(firebaseUser.accessToken);
      } else {
        // Clear session if Firebase Auth is not active
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('vakildot_token', newToken);
    localStorage.setItem('vakildot_user', JSON.stringify(userData));
    localStorage.setItem('vakildot_lawyer', JSON.stringify(userData)); 
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    auth.signOut(); 
    localStorage.removeItem('vakildot_token');
    localStorage.removeItem('vakildot_user');
    localStorage.removeItem('vakildot_lawyer');
    setToken(null);
    setUser(null);
  };

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/" />;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg font-medium">Syncing with VakilDesk...</p>
      </div>
    );
  }

  const userRole = user?.user_role || 'lawyer';

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Welcome />} />
        <Route path="/signin" element={token ? <Navigate to="/dashboard" /> : <SignIn onLogin={handleLogin} />} />
        <Route path="/signup/lawyer" element={token ? <Navigate to="/dashboard" /> : <LawyerOnboarding onComplete={handleLogin} />} />
        <Route path="/signup/client" element={token ? <Navigate to="/dashboard" /> : <ClientOnboarding onComplete={handleLogin} />} />
        
        {/* Protected Application Routes */}
        <Route path="/" element={<PrivateRoute><Layout user={user} onLogout={handleLogout} /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard userRole={userRole} />} />
          
          {/* Linked to Firestore Collections: Cases & Clients */}
          <Route path="cases" element={<Cases userRole={userRole} />} />
          <Route path="cases/:caseId" element={<CaseDetail userRole={userRole} />} />
          
          {/* Restricted Routes for Lawyers Only */}
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

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;