import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

// Sample stub invoices for MVP table
const sampleInvoices = Array.from({ length: 20 }, (_, i) => ({
  id: 1000 + i,
  carrier: `Carrier ${i % 5 + 1}`,
  amount: Math.floor(Math.random() * 5000) + 100,
  status: Math.random() > 0.8 ? "Mismatch" : "Matched",
  uploadedAt: new Date().toLocaleDateString(),
}));

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [invoices, setInvoices] = useState(sampleInvoices);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) {
        navigate("/", { replace: true });
        return;
      }
      setUser(data.session.user);

      // Load profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company,phone")
        .eq("id", data.session.user.id)
        .single();
      if (error) console.error(error);
      if (profile) {
        setCompany(profile.company || "");
        setPhone(profile.phone || "");
      }
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) navigate("/", { replace: true });
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, company, phone });
    if (error) {
      alert("Error saving profile");
      console.error(error);
    } else {
      alert("Profile saved");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (!user)
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading user...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      {/* Trial Banner */}
      <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-6 rounded w-full max-w-md text-center">
        You have <strong>5 days</strong> left in your free trial!
      </div>

      {/* Profile & Logout */}
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">
            Welcome, {user.email}
          </h1>
          <button
            onClick={logout}
            className="px-3 py-2 border rounded hover:bg-gray-100 transition"
          >
            Log out
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
          >
            Save
          </button>
        </div>
      </div>

      {/* Upload Invoice Button */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <button className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition">
          Upload Invoice
        </button>
      </div>

      {/* Invoice Table */}
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Carrier
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Date Uploaded
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-3">{inv.id}</td>
                <td className="px-6 py-3">{inv.carrier}</td>
                <td className="px-6 py-3">${inv.amount}</td>
                <td
                  className={`px-6 py-3 font-semibold ${
                    inv.status === "Matched" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {inv.status}
                </td>
                <td className="px-6 py-3">{inv.uploadedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
