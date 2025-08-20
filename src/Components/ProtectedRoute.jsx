import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setLoading(false);
    };
    checkSession();

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (loading) return <div>Loading...</div>;

  // Redirect to login if no active session
  if (!session) return <Navigate to="/login" replace />;

  return children;
}
