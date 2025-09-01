// src/Dashboard.jsx
import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";
import { uploadRateSheets } from "../features/uploadRateSheets";
import { generateReports } from "../features/generateReports";
import { reconcileInvoice, retryUpload, markFixed } from "../features/reconcileInvoice";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [uploads, setUploads] = useState([]);
  const [recolinations, setRecolinations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch uploads
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/"; // redirect if not logged in
      } else {
        await fetchUploads();
      }
    };
    fetchUserAndData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // redirect
  };

  // File upload handlers
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

  // Map errors for Discrepancies card
  const errorRows = recolinations.filter((r) => r.status === "error");

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/logo.png" alt="TallyHauls Logo" className="logo" />
        </div>
        <nav className="dashboard-nav">
          <a href="/reports">Reports</a>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      {showBanner && <div className="secure-banner">You are securely logged in.</div>}

      {/* KPI Bar */}
      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-amber"></span> Pending Invoices
          </div>
          <div className="kpi-value">
            {uploads.filter((u) => u.status === "pending" && u.type === "invoice").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-green"></span> Cleared Invoices
          </div>
          <div className="kpi-value">
            {uploads.filter((u) => u.status === "cleared" && u.type === "invoice").length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-red"></span> Errors Detected & Fixed
          </div>
          <div className="kpi-value">{errorRows.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-blue"></span> Total Files Uploaded
          </div>
          <div className="kpi-value">{uploads.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-purple"></span> Time Saved This Week
          </div>
          <div className="kpi-value">72 hrs</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="two-col">
        {/* Left: Recent Activity */}
        <div className="card">
          <div className="card-head">
            <h3>Recent Activity</h3>
          </div>
          <ul className="activity-list">
            {uploads.slice(0, 5).map((row) => (
              <li key={row.filename + row.uploaded_at}>
                <span className="time">{new Date(row.uploaded_at).toLocaleTimeString()}</span>
                <span className="text">{row.filename} uploaded ({row.status})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Discrepancies */}
        <div className="card">
          <div className="card-head">
            <h3>Discrepancies</h3>
          </div>
          <ul className="error-list">
            {errorRows.length === 0 && <li>No errors detected</li>}
            {errorRows.map((row) => (
              <li key={row.invoice_id + row.ratesheet_id}>
                <div className="err-main">
                  <span className="badge medium">{row.errors || "Error"}</span>
                  {row.invoice_id} / {row.ratesheet_id}
                </div>
                <div className="err-actions">
                  <button
                    className="btn-outline small"
                    onClick={async () => {
                      await retryUpload(row.id || row.recolination_id);
                      await fetchUploads();
                    }}
                  >
                    Retry
                  </button>
                  <button
                    className="btn-outline small"
                    onClick={async () => {
                      await markFixed(row.id || row.recolination_id);
                      await fetchUploads();
                    }}
                  >
                    Fix
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head">
          <h3>Uploads</h3>
          <div className="filters">
            <input type="text" placeholder="Search…" />
            <select>
              <option>Status</option>
              <option>Successful</option>
              <option>Pending</option>
              <option>Errors</option>
            </select>
          </div>
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
              {uploads.map((row) => (
                <tr key={row.recolination_id || row.filename + row.uploaded_at}>
                  <td>{row.recolination_id || "-"}</td>
                  <td>{row.filename}</td>
                  <td>{new Date(row.uploaded_at).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`status ${
                        row.status === "error"
                          ? "err"
                          : row.status === "pending"
                          ? "pending"
                          : "ok"
                      }`}
                    >
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
      <div className="quick-actions horizontal">
        <input
          type="file"
          id="invoice-upload"
          style={{ display: "none" }}
          onChange={handleInvoiceUpload}
        />
        <input
          type="file"
          id="ratesheet-upload"
          style={{ display: "none" }}
          onChange={handleRateSheetUpload}
        />

        <button
          className="qa-btn"
          onClick={() => document.getElementById("invoice-upload").click()}
        >
          Upload Invoices
        </button>
        <button
          className="qa-btn"
          onClick={() => document.getElementById("ratesheet-upload").click()}
        >
          Upload Rate Sheets
        </button>
        <button className="qa-btn" onClick={generateReports}>
          Generate Reports
        </button>
      </div>

      <footer className="dash-footer">© 2025 TallyHauls – All Rights Reserved</footer>
    </div>
  );
}
