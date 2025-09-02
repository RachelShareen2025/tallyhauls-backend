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
  const [recolinations, setRecolinations] = useState([]);
  const [loading, setLoading] = useState(false);

  const invoiceInputRef = useRef(null);
  const rateSheetInputRef = useRef(null);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const { data: uploadsData, error: uploadsErr } = await supabase
        .from("uploads")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (uploadsErr) throw uploadsErr;
      setUploads(uploadsData || []);

      const { data: recolData, error: recolErr } = await supabase
        .from("recolination")
        .select("*");
      if (recolErr) throw recolErr;
      setRecolinations(recolData || []);
    } catch (err) {
      console.error("Error fetching uploads/recolinations:", err.message);
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
      await uploadInvoiceFile(file);
      await fetchUploads();
    }
  };

  const handleRateSheetUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadRateSheets(file);
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
            {uploads.filter((u) => u.status === "pending" && u.type === "invoice").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-green"></span> Cleared Invoices</div>
          <div className="kpi-value">
            {uploads.filter((u) => u.status === "cleared" && u.type === "invoice").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-red"></span> Errors Detected & Fixed</div>
          <div className="kpi-value">
            {recolinations.filter((r) => r.status === "error").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-blue"></span> Total Files Uploaded</div>
          <div className="kpi-value">{uploads.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-purple"></span> Time Saved This Week</div>
          <div className="kpi-value">72 hrs</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head">
          <h3>Uploads</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Date</th>
                <th>Status</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "16px" }}>
                    No uploads yet.
                  </td>
                </tr>
              )}
              {uploads.map((row) => (
                <tr key={row.recolination_id || row.filename + row.uploaded_at}>
                  <td>{row.recolination_id || "-"}</td>
                  <td>{row.filename}</td>
                  <td>{new Date(row.uploaded_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status ${row.status === "error" ? "err" : row.status === "pending" ? "pending" : "ok"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="right">{row.amount || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
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

      <footer className="dash-footer">© 2025 TallyHauls – All Rights Reserved</footer>
    </div>
  );
}
