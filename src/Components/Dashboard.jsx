// src/Components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { computeKPIs } from "../features/calcNetCash";

// New components
import NetCashSummary from "./NetCashSummary";
import InvoiceTable from "./InvoiceTable";
import UploadCSV from "./UploadCSV";
import Filters from "./Filters";

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const invoiceInputRef = useRef(null);

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // On mount: auth + fetch
  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/";
      } else {
        await fetchInvoices();
      }
    };
    fetchUserAndData();
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Upload invoices (passed to UploadCSV component)
  const handleInvoiceUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const { success, error, fileUrl } = await import("../features/uploadInvoiceFile")
        .then(mod => mod.uploadInvoiceFile(file));

      if (!success) {
        alert(`❌ Upload failed: ${error}`);
      } else {
        await fetchInvoices();
      }
    } catch (err) {
      console.error("Upload error:", err.message);
    } finally {
      setLoading(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  };

  const kpis = computeKPIs(invoices);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/logo.png" alt="TallyHauls Logo" className="logo" />
        </div>
        <nav className="dashboard-nav">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      {/* KPI Bar */}
      <NetCashSummary kpis={kpis} />

      {/* Quick Actions */}
      <div className="quick-actions horizontal">
        <UploadCSV onUpload={handleInvoiceUpload} ref={invoiceInputRef} />
        <Filters searchQuery={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Invoice Table */}
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />

      <footer className="dash-footer">© 2025 TallyHauls – All Rights Reserved</footer>
    </div>
  );
}
