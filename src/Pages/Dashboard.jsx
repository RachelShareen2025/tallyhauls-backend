// src/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";
import { generateReports } from "../features/generateReports";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const invoiceInputRef = useRef(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `id, invoice_number, invoice_date, client_name, carrier_name,
           amount, status, flagged, projected_cash_date, due_date,
           load_number, notes, uploaded_at, file_url`
        )
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleInvoiceUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadInvoiceFile(file, null);
      await fetchInvoices();
    }
  };

  // KPI calculations
  const pendingInvoices = invoices.filter((inv) => inv.status !== "Paid");
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid");
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

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

      {showBanner && (
        <div className="secure-banner">You are securely logged in.</div>
      )}

      {/* KPI Bar */}
      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-amber"></span> Pending Invoices</div>
          <div className="kpi-value">{pendingInvoices.length} (${pendingAmount.toFixed(2)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-green"></span> Paid Invoices</div>
          <div className="kpi-value">{paidInvoices.length} (${paidAmount.toFixed(2)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-blue"></span> Total Invoices</div>
          <div className="kpi-value">{invoices.length} (${totalAmount.toFixed(2)})</div>
        </div>
      </div>

      {/* Upload + Actions */}
      <div className="quick-actions horizontal" style={{ marginBottom: "32px" }}>
        <input
          type="file"
          ref={invoiceInputRef}
          style={{ display: "none" }}
          onChange={handleInvoiceUpload}
        />
        <button className="qa-btn" onClick={() => invoiceInputRef.current && invoiceInputRef.current.click()}>
          Upload Invoices
        </button>
        <button className="qa-btn" onClick={generateReports}>
          Generate Reports
        </button>
      </div>

      {/* Invoices Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head">
          <h3>Invoices</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Load #</th>
                <th>Carrier</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Projected Cash Date</th>
                <th>Due Date</th>
                <th>Days Until Due</th>
                <th>Notes</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ textAlign: "center", padding: "16px" }}>
                    No invoices uploaded yet.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const daysUntilDue = inv.due_date
                  ? Math.ceil((new Date(inv.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <tr key={inv.id} className={inv.flagged ? "row-flagged" : ""}>
                    <td>{inv.invoice_number}</td>
                    <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td>{inv.client_name}</td>
                    <td>{inv.load_number || "—"}</td>
                    <td>{inv.carrier_name}</td>
                    <td>${inv.amount.toFixed(2)}</td>
                    <td>{inv.status}</td>
                    <td>{inv.projected_cash_date ? new Date(inv.projected_cash_date).toLocaleDateString() : "—"}</td>
                    <td className={daysUntilDue !== null && daysUntilDue < 0 ? "overdue" : ""}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                    </td>
                    <td className={daysUntilDue !== null && daysUntilDue < 0 ? "overdue" : ""}>
                      {daysUntilDue !== null ? daysUntilDue : "—"}
                    </td>
                    <td className="notes">{inv.notes || "—"}</td>
                    <td><a href={inv.file_url} target="_blank" rel="noreferrer">View</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dash-footer">
        © 2025 TallyHauls – All Rights Reserved
      </footer>
    </div>
  );
}
