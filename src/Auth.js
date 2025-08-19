import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Listen for auth state changes to auto-redirect
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Redirect to dashboard
        if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard';
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Magic link login only
  async function magicLink() {
    setLoading(true);
    setMessage('');

    try {
      // Always redirect to production dashboard
      const redirectTo =
        window.location.hostname.includes('localhost')
          ? 'http://localhost:3000/dashboard'
          : 'https://app.tallyhauls.com/dashboard';

      const { error } = await supabase.auth.signInWithOtp(
        { email },
        { redirectTo } // <-- must be second argument
      );

      if (error) {
        console.error('Magic link error:', error);
        setMessage(`Magic link error: ${error.message}`);
      } else {
        setMessage('✅ Magic link sent! Check your email.');
      }
    } catch (err) {
      console.error(err);
      setMessage(`Magic link error: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: 6 }}>Welcome to TallyHauls</h2>
      <p style={{ marginTop: 0, marginBottom: 18 }}>Your Freight Finances, Simplified. Enter your email to continue.</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        style={{ width: '100%', padding: 10, marginBottom: 16, boxSizing: 'border-box' }}
      />

      <button
        onClick={magicLink}
        disabled={loading || !email}
        style={{ width: '100%', padding: 12, marginBottom: 10, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Send Magic Link
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
