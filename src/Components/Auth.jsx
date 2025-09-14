import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) navigate("/dashboard", { replace: true });
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
        emailRedirectTo:
          process.env.REACT_APP_DASHBOARD_URL ||
          "http://localhost:3000/dashboard",
        shouldCreateUser: true,
      },
    });

    if (error) setMsg(error.message);
    else setMsg("Magic link sent! Check your email to login.");

    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* ✅ Logo at top */}
      <img src="/logo.png" alt="TallyHauls Logo" className="auth-logo" />

      <h1>Login to TallyHauls</h1>

      <form onSubmit={handleMagicLink} className="auth-form">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>

      {msg && <p className="auth-msg">{msg}</p>}
    </div>
  );
}
