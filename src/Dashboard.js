import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch current user session
    const session = supabase.auth.getSession();
    session.then(res => {
      if (res.data?.session?.user) {
        setUser(res.data.session.user);
      } else {
        // Redirect to Auth if not logged in
        navigate('/');
      }
    });

    // Listen for auth state changes
    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2>Welcome to TallyHauls Dashboard</h2>
      {user && <p>Email: {user.email}</p>}
      <p>This is your MVP placeholder dashboard. Replace with real UI later.</p>
      <button onClick={handleLogout} style={{ width: '100%', padding: 12, marginTop: 20 }}>
        Logout
      </button>
    </div>
  );
}
