import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import './App.css';


function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;