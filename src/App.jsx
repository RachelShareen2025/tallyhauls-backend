import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import Auth from "./components/Auth";
import Frontend from "./components/Frontend";
import { supabase } from "./supabaseClient";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import RefundPolicy from "./components/RefundPolicy";

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
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />

        {/* Protected dashboard routes */}
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
        <Route
          path="/Dashboard"
          element={
            <ProtectedRoute session={session}>
              <Frontend userEmail={session?.user?.email} />
            </ProtectedRoute>
          }
        />

        {/* Public legal pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/refund" element={<RefundPolicy />} />

        {/* Fallback */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
