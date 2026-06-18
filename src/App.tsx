import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import DashboardWithTable from "./pages/DashboardWithTable";
import ViewOrders from "./pages/ViewOrders";
import Chatbot from "./components/chatbot";
import type { Session } from "@supabase/supabase-js"; // 1. Add this import

function App() {
  // 2. Tell the state it will hold a Session or null
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // 3. Explicitly handle the data fetch
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthChecked(true);
    });

    // 4. Type the parameters for the listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return null; // or a loader component while we determine session
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/chatbot" element={session ? <Chatbot /> : <Auth />} />
        {/* <Route
          path="/orders/:table/:session"
          element={session ? <DashboardWithTable /> : <Navigate to="/orders" />}
        /> */}
        <Route
          path="/"
          element={!session ? <Auth /> : <Navigate to="/chatbot" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/orders" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
