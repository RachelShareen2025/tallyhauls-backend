import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;
      setUser(data.user);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company,phone')
        .eq('id', data.user.id)
        .single();

      if (error) console.error(error);
      if (profile) {
        setCompany(profile.company || '');
        setPhone(profile.phone || '');
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, company, phone });
    if (error) {
      alert('Error saving profile');
      console.error(error);
    } else {
      alert('Profile saved');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (!user) return <div className="flex justify-center items-center h-screen">Loading user...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Welcome, {user.email}</h1>
          <button 
            onClick={logout} 
            className="px-3 py-2 border rounded hover:bg-gray-100 transition"
          >
            Log out
          </button>
        </div>

        <div className="flex flex-col">
          <input
            placeholder="Company"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
