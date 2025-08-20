import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          navigate('/login', { replace: true });
          return;
        }
        setUser(userData.user);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company,phone')
          .eq('id', userData.user.id)
          .single();

        if (!profileError && profile) {
          setCompany(profile.company || '');
          setPhone(profile.phone || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, company, phone });
      if (error) throw error;
      alert('Profile saved!');
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (loading) return <div>Loading user...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl">Welcome, {user.email}</h1>
        <button onClick={logout} className="px-3 py-2 border rounded">Log out</button>
      </div>
      <div className="mt-6">
        <input
          placeholder="Company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          className="w-full p-2 border mb-3"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full p-2 border mb-3"
        />
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}
