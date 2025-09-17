import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Components/Landing";
import Auth from "./Components/Auth";
import Frontend from "./Components/Frontend";
import { supabase } from "./supabaseClient";

// ProtectedRoute prevents remount flicker
function ProtectedRoute({ session, children }) {
  if (!session) return <Auth />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    getSession();

    // Listen for session changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/auth"
          element={
            <ProtectedRoute session={session}>
              <Frontend userEmail={session?.user?.email} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/frontend"
          element={
            <ProtectedRoute session={session}>
              <Frontend userEmail={session?.user?.email} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
