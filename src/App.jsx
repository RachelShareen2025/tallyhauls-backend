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
    let isMounted = true;

    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) console.error("Session fetch error:", error);
      setSession(data.session);
      setLoading(false);
    };

    getSession();

    // Listen for session changes only when necessary
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession((prev) => {
        if (prev?.access_token === newSession?.access_token) return prev; // no change
        return newSession;
      });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
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
