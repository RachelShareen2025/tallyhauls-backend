import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;

      if (!currentUser) {
        navigate('/');
        return;
      }

      // Fetch full user row from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
      } else {
        setUser(data);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2>Welcome to TallyHauls Dashboard</h2>
      {user ? (
        <>
          <p>Email: {user.email}</p>
          <p>Company: {user.company || 'N/A'}</p>
          <p>Contact Info: {user.contact_info || 'N/A'}</p>
        </>
      ) : (
        <p>Loading user data...</p>
      )}
      <p>This is your MVP placeholder dashboard. Replace with real UI later.</p>
      <button onClick={handleLogout} style={{ width: '100%', padding: 12, marginTop: 20 }}>
        Logout
      </button>
    </div>
  );
}
