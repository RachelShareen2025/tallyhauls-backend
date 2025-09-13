// src/Dashboard.jsx
import React, { useState } from "react";
import "./Dashboard.css";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiRange, setKpiRange] = useState(30);

  // Placeholder data (to be wired later)
  const invoices = []; // Replace with processed invoices from features
  const kpis = {
    netCashFlow: 0,
    totalReceivables: 0,
    totalPayables: 0,
    overdueAmount: 0,
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/logo.png" alt="TallyHauls Logo" className="logo" />
        </div>
        <nav className="dashboard-nav">
          <button className="logout-btn">Logout</button>
        </nav>
      </header>

      {showBanner && <div className="secure-banner">You are securely logged in.</div>}

      {/* KPI Bar */}
      <div className="kpi-bar">
        {["30", "60", "90"].map((d) => (
          <button
            key={d}
            className={`kpi-range-btn ${kpiRange === Number(d) ? "active" : ""}`}
            onClick={() => setKpiRange(Number(d))}
          >
            {d} Days
          </button>
        ))}

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-green"></span> Net Cash Flow
          </div>
          <div className={`kpi-value ${kpis.netCashFlow < 0 ? "negative" : ""}`}>
            ${kpis.netCashFlow.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-amber"></span> Total Receivables
          </div>
          <div className="kpi-value">${kpis.totalReceivables.toFixed(2)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-blue"></span> Total Payables
          </div>
          <div className="kpi-value">${kpis.totalPayables.toFixed(2)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-red"></span> Overdue Amount
          </div>
          <div className="kpi-value">${kpis.overdueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions horizontal">
        <button className="qa-btn">Upload Invoices</button>
        <button className="qa-btn">Generate Reports</button>
        <input
          type="text"
          placeholder="Search invoices..."
          className="search-bar"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head">
          <h3>Invoices</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Load #</th>
                <th>Bill Date</th>
                <th>Shipper</th>
                <th className="numeric">Load Rate ($)</th>
                <th>Shipper Terms</th>
                <th>Shipper Paid</th>
                <th>Carrier</th>
                <th className="numeric">Carrier Pay ($)</th>
                <th>Carrier Terms</th>
                <th>Carrier Paid</th>
                <th className="numeric">Net Cash</th>
                <th>Flagged Reason</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", padding: "16px" }}>
                    No invoices uploaded yet.
                  </td>
                </tr>
              )}

              {invoices.map((inv) => (
                <tr key={inv.id} className={inv.flagged_reason ? "row-flagged" : ""}>
                  <td>{inv.load_number || "—"}</td>
                  <td>{inv.bill_date || "—"}</td>
                  <td>{inv.shipper || "—"}</td>
                  <td className="numeric">{inv.total_charge || 0}</td>
                  <td>{inv.shipper_terms || "—"}</td>
                  <td>{inv.shipper_paid ? "✔" : "—"}</td>
                  <td>{inv.carrier || "—"}</td>
                  <td className="numeric">{inv.carrier_pay || 0}</td>
                  <td>{inv.carrier_terms || "—"}</td>
                  <td>{inv.carrier_paid ? "✔" : "—"}</td>
                  <td className="numeric">{inv.netCash || 0}</td>
                  <td>{inv.flagged_reason || "—"}</td>
                  <td>{inv.file_url ? <a href={inv.file_url}>View</a> : "—"}</td>
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
