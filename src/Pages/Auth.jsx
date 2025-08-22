import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) navigate("/dashboard", { replace: true });
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) navigate("/dashboard", { replace: true });
      }
    );
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: process.env.REACT_APP_DASHBOARD_URL || "http://localhost:3000/dashboard",
      },
    });

    if (error) setMsg(error.message);
    else setMsg("Magic link sent! Check your email to login.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 sm:px-6">
      <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-600 text-center mb-6">TallyHauls</h1>
        <h2 className="text-xl font-medium text-gray-700 text-center mb-6">Login or Sign Up</h2>

        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {msg && (
          <p className="mt-4 text-center text-gray-600 text-sm break-words">{msg}</p>
        )}
      </div>
    </div>
  );
}
