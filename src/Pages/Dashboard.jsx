// src/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";
import { uploadRateSheets } from "../features/uploadRateSheets";
import { generateReports } from "../features/generateReports";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);

  const invoiceInputRef = useRef(null);
  const rateSheetInputRef = useRef(null);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      // Fetch invoices
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from("invoices")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (invoiceErr) throw invoiceErr;

      // Fetch ratesheets
      const { data: rateSheetData, error: rateErr } = await supabase
        .from("ratesheets")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (rateErr) throw rateErr;

      // Combine for single table
      const combinedUploads = [
        ...invoiceData.map((i) => ({ ...i, type: "invoice" })),
        ...rateSheetData.map((r) => ({ ...r, type: "ratesheet" })),
      ];
      setUploads(combinedUploads);

      // Fetch reconciliation reports
      const { data: recData, error: recErr } = await supabase
        .from("reconciliation_reports")
        .select("*");
      if (recErr) throw recErr;
      setReconciliations(recData || []);
    } catch (err) {
      console.error("Error fetching data:", err.message);
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
        await fetchUploads();
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
      // Pass brokerId if available
      await uploadInvoiceFile(file, null);
      await fetchUploads();
    }
  };

  const handleRateSheetUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Pass brokerId if available
      await uploadRateSheets(file, null);
      await fetchUploads();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/logo.png" alt="TallyHauls Logo" className="logo" />
        </div>
        <nav className="dashboard-nav">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      {showBanner && <div className="secure-banner">You are securely logged in.</div>}

      {/* KPI Bar */}
      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-amber"></span> Pending Invoices</div>
          <div className="kpi-value">
            {uploads.filter((u) => u.type === "invoice" && u.parse_status === null).length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-green"></span> Total Invoices</div>
          <div className="kpi-value">
            {uploads.filter((u) => u.type === "invoice").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-red"></span> Reconciliation Errors</div>
          <div className="kpi-value">
            {reconciliations.filter((r) => r.reconciliation_status === "discrepancy").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-blue"></span> Total Files Uploaded</div>
          <div className="kpi-value">{uploads.length}</div>
        </div>
      </div>

      {/* Upload Buttons */}
      <div className="quick-actions horizontal" style={{ marginBottom: "32px" }}>
        <input
          type="file"
          ref={invoiceInputRef}
          style={{ display: "none" }}
          onChange={handleInvoiceUpload}
        />
        <input
          type="file"
          ref={rateSheetInputRef}
          style={{ display: "none" }}
          onChange={handleRateSheetUpload}
        />
        <button className="qa-btn" onClick={() => invoiceInputRef.current && invoiceInputRef.current.click()}>
          Upload Invoices
        </button>
        <button className="qa-btn" onClick={() => rateSheetInputRef.current && rateSheetInputRef.current.click()}>
          Upload Rate Sheets
        </button>
        <button className="qa-btn" onClick={generateReports}>Generate Reports</button>
      </div>

      {/* Data Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head"><h3>Uploads</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>File</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>No uploads yet.</td>
                </tr>
              )}
              {uploads.map((row) => (
                <tr key={row.id}>
                  <td>{row.type}</td>
                  <td><a href={row.file_url} target="_blank" rel="noreferrer">{row.file_name}</a></td>
                  <td>{new Date(row.uploaded_at).toLocaleDateString()}</td>
                  <td>{row.parse_status || "pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dash-footer">© 2025 TallyHauls – All Rights Reserved</footer>
    </div>
  );
}
