// src/Components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user has a session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase session error:", error.message);
          setAuthenticated(false);
        } else {
          setAuthenticated(!!data?.session?.user);
        }
      } catch (err) {
        console.error("Unexpected error checking session:", err);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthenticated(!!session?.user);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // While checking session
  if (loading) return <p className="text-center mt-10">Loading...</p>;

  // Redirect if not authenticated
  if (!authenticated) return <Navigate to="/" replace />;

  return children;
}
