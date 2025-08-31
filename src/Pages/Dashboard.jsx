import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoices } from "../features/uploadInvoices";
import { uploadRateSheets } from "../features/uploadRateSheets";
import { generateReports } from "../features/generateReports";
import { reconcileInvoice } from "../features/reconcileInvoice";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/"; // redirect if not logged in
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // redirect to landing page
  };

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

      {showBanner && (
        <div className="secure-banner">You are securely logged in.</div>
      )}

      {/* KPI Bar */}
      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-amber"></span> Pending Invoices
          </div>
          <div className="kpi-value">342</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-green"></span> Cleared Invoices
          </div>
          <div className="kpi-value">1,245</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-red"></span> Errors Detected & Fixed
          </div>
          <div className="kpi-value">18</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-blue"></span> Total Files Uploaded
          </div>
          <div className="kpi-value">1,605</div>
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
            <li>
              <span className="time">10:24 AM</span>
              <span className="text">Invoice #1024 uploaded</span>
            </li>
            <li>
              <span className="time">9:10 AM</span>
              <span className="text">Rate sheet updated</span>
            </li>
            <li>
              <span className="time">Yesterday</span>
              <span className="text">Invoice #1023 failed to upload</span>
            </li>
          </ul>
        </div>

        {/* Right: Discrepancies */}
        <div className="card">
          <div className="card-head">
            <h3>Discrepancies</h3>
          </div>
          <ul className="error-list">
            <li>
              <div className="err-main">
                <span className="badge high">High</span>
                Invoice #1023 error
              </div>
              <div className="err-actions">
                <button
                  className="btn-outline small"
                  onClick={() =>
                    reconcileInvoice("1023-uuid-placeholder", "rateSheet-uuid-placeholder")
                  }
                >
                  Retry
                </button>
              </div>
            </li>
            <li>
              <div className="err-main">
                <span className="badge medium">Medium</span>
                Rate mismatch found
              </div>
              <div className="err-actions">
                <button
                  className="btn-outline small"
                  onClick={() =>
                    reconcileInvoice("invoice-uuid-placeholder", "rateSheet-uuid-placeholder")
                  }
                >
                  Fix
                </button>
              </div>
            </li>
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
              <tr>
                <td>#1024</td>
                <td>Invoice Jan.pdf</td>
                <td>2025-08-30</td>
                <td>
                  <span className="status ok">OK</span>
                </td>
                <td className="right">$1,200</td>
              </tr>
              <tr>
                <td>#1023</td>
                <td>Invoice Feb.pdf</td>
                <td>2025-08-29</td>
                <td>
                  <span className="status err">Error</span>
                </td>
                <td className="right">$980</td>
              </tr>
              <tr>
                <td>#1022</td>
                <td>Rate Sheet Mar.xlsx</td>
                <td>2025-08-28</td>
                <td>
                  <span className="status pending">Pending</span>
                </td>
                <td className="right">–</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions horizontal">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          style={{ marginBottom: "12px" }}
        />
        <button
          className="qa-btn"
          onClick={() => uploadInvoices(selectedFile)}
        >
          Upload Invoices
        </button>
        <button
          className="qa-btn"
          onClick={() => uploadRateSheets(selectedFile)}
        >
          Upload Rate Sheets
        </button>
        <button className="qa-btn" onClick={generateReports}>
          Generate Reports
        </button>
      </div>

      <footer className="dash-footer">
        © 2025 TallyHauls – All Rights Reserved
      </footer>
    </div>
  );
}
