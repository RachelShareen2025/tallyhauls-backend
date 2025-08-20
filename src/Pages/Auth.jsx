import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const DASHBOARD_URL = process.env.REACT_APP_DASHBOARD_URL || 'https://app.tallyhauls.com/dashboard';

  // Redirect if already logged in
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) navigate('/dashboard', { replace: true });
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [navigate]);

  // Email/password signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMsg('Signup successful! Please check your email for verification.');
    } catch (err) {
      setMsg(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Email/password login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMsg('Login successful! Redirecting...');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Optional magic link (rate limit prone)
  const sendMagicLink = async () => {
    setLoading(true);
    setMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: DASHBOARD_URL },
      });
      if (error) throw error;
      setMsg('Magic link sent! Check your email.');
    } catch (err) {
      setMsg(err.message || 'Magic link failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl mb-4">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>

      <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Email"
          className="w-full p-2 mb-3 border"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="Password"
          className="w-full p-2 mb-3 border"
        />

        <div className="flex gap-2 mb-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="px-3 py-2 border rounded"
          >
            {mode === 'login' ? 'Switch to Sign Up' : 'Switch to Login'}
          </button>

          <button
            type="button"
            onClick={sendMagicLink}
            className="px-3 py-2 border rounded"
          >
            Magic Link
          </button>
        </div>
      </form>

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
