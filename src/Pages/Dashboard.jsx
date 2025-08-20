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

  if (!user) return <div>Loading user...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl">Welcome, {user.email}</h1>
        <button onClick={logout} className="px-3 py-2 border">Log out</button>
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
