// src/Components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import InvoiceTable from "./InvoiceTable";
import UploadCSV from "./UploadCSV";
import Filters from "./Filters";

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const invoiceInputRef = useRef(null);

  // Fetch invoices safely
  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) setInvoices(data);
      // Don't overwrite invoices if fetch returns empty
    } catch (err) {
      console.error("Error fetching invoices:", err);
      // Keep old invoices intact
    }
  };

  // On mount: get user email and fetch invoices
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) window.location.href = "/";
        else {
          setUserEmail(session.user.email);
          await fetchInvoices();
        }
      } catch (err) {
        console.error("Error getting session:", err);
        window.location.href = "/";
      }
    };
    fetchUser();
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Handle invoice upload (trigger refresh after upload)
  const handleInvoiceUpload = async (file) => {
    await fetchInvoices();
  };

  return (
    <div className="dashboard-container p-4">
      <header className="dashboard-header flex justify-between items-center mb-4">
        <img src="/logo.png" alt="TallyHauls" className="logo h-10" />
        <button
          className="bg-red-500 text-white px-3 py-1 rounded"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <div className="quick-actions flex gap-4 mb-4">
        <UploadCSV
          onUpload={handleInvoiceUpload}
          brokerEmail={userEmail}
          ref={invoiceInputRef}
        />
        <Filters searchQuery={searchQuery} onChange={setSearchQuery} />
      </div>

      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />
    </div>
  );
};

export default Dashboard;
