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
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiRange, setKpiRange] = useState(30);
  const [uploadStatus, setUploadStatus] = useState(null);
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

  // Upload invoices
  const handleInvoiceUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus("Uploading...");
    const result = await uploadInvoiceFile(file);

    if (result.success) {
      setUploadStatus("✅ Uploaded successfully!");
      await fetchInvoices();
    } else {
      setUploadStatus(`❌ Upload failed: ${result.error}`);
    }

    if (invoiceInputRef.current) invoiceInputRef.current.value = "";
  };

  // KPI calculation
  const computeKPIs = (rangeDays = kpiRange) => {
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() + rangeDays));

    const filteredInvoices = invoices.filter(inv => {
      const billDate = inv.bill_date ? new Date(inv.bill_date) : null;
      return billDate && billDate <= cutoffDate;
    });

    const totalReceivables = filteredInvoices
      .filter(inv => !inv.shipper_paid)
      .reduce((sum, inv) => sum + Number(inv.total_charge || 0), 0);

    const totalPayables = filteredInvoices
      .filter(inv => !inv.carrier_paid)
      .reduce((sum, inv) => sum + Number(inv.carrier_pay || 0), 0);

    const actualNet = totalReceivables - totalPayables;

    // Projected net (assume all unpaid will be paid on due)
    const projectedReceivables = filteredInvoices.reduce(
      (sum, inv) => sum + Number(inv.total_charge || 0), 0
    );
    const projectedPayables = filteredInvoices.reduce(
      (sum, inv) => sum + Number(inv.carrier_pay || 0), 0
    );
    const projectedNet = projectedReceivables - projectedPayables;

    const overdueAmount = filteredInvoices
      .filter(inv => {
        const today = new Date();
        const shipperDue = inv.bill_date && inv.shipper_terms
          ? new Date(new Date(inv.bill_date).getTime() + inv.shipper_terms * 86400000)
          : null;
        const carrierDue = inv.bill_date && inv.carrier_terms
          ? new Date(new Date(inv.bill_date).getTime() + inv.carrier_terms * 86400000)
          : null;

        return (!inv.shipper_paid && shipperDue && shipperDue < today) ||
               (!inv.carrier_paid && carrierDue && carrierDue < today);
      })
      .reduce((sum, inv) => sum + Number(inv.total_charge || 0), 0);

    return { actualNet, projectedNet, totalReceivables, totalPayables, overdueAmount };
  };

  const { actualNet, projectedNet, totalReceivables, totalPayables, overdueAmount } = computeKPIs();

  // Search filter
  const filteredInvoices = invoices.filter(inv =>
    JSON.stringify(inv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Editable field update
  const handleFieldChange = async (id, field, value) => {
    try {
      await supabase.from("invoices").update({ [field]: value }).eq("id", id);
      await fetchInvoices();
    } catch (err) {
      console.error("Error updating field:", err);
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
        {["30", "60", "90"].map(d => (
          <button
            key={d}
            className={`kpi-range-btn ${kpiRange === Number(d) ? "active" : ""}`}
            onClick={() => setKpiRange(Number(d))}
          >
            {d} Days
          </button>
        ))}
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-blue"></span> Projected Net</div>
          <div className="kpi-value">${projectedNet.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-green"></span> Actual Net</div>
          <div className={`kpi-value ${actualNet < 0 ? "negative-text" : ""}`}>
            ${actualNet.toFixed(2)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-amber"></span> Total Receivables</div>
          <div className="kpi-value">${totalReceivables.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-red"></span> Overdue Amount</div>
          <div className="kpi-value">${overdueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions horizontal">
        <input
          type="file"
          ref={invoiceInputRef}
          style={{ display: "none" }}
          onChange={handleInvoiceUpload}
        />
        <button className="qa-btn" onClick={() => invoiceInputRef.current && invoiceInputRef.current.click()}>
          Upload Invoices
        </button>
        <button className="qa-btn" onClick={generateReports}>Generate Reports</button>
        <input
          type="text"
          placeholder="Search invoices..."
          className="search-bar"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {uploadStatus && <div className="upload-status">{uploadStatus}</div>}

      {/* Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head"><h3>Invoices</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Load #</th>
                <th>Bill Date</th>
                <th>Shipper</th>
                <th>Load Rate ($)</th>
                <th>Shipper Terms</th>
                <th>Shipper Paid</th>
                <th>Carrier</th>
                <th>Carrier Pay ($)</th>
                <th>Carrier Terms</th>
                <th>Carrier Paid</th>
                <th>Net Cash</th>
                <th>Projected Net</th>
                <th>Flagged Reason</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "16px" }}>
                    No invoices uploaded yet.
                  </td>
                </tr>
              )}
              {filteredInvoices.map(inv => {
                const loadCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
                const projectedLoadCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
                const rowClass = loadCash < 0 ? "row-negative" : (inv.flagged_reason ? "row-flagged" : "");

                return (
                  <tr key={inv.id} className={rowClass}>
                    <td>{inv.load_number || "—"}</td>
                    <td>{inv.bill_date ? new Date(inv.bill_date).toLocaleDateString() : "—"}</td>
                    <td>{inv.shipper}</td>
                    <td>{inv.total_charge?.toFixed(2) || "0.00"}</td>
                    <td>
                      <input
                        className="oval-input"
                        type="text"
                        value={inv.shipper_terms || ""}
                        onChange={(e) => handleFieldChange(inv.id, "shipper_terms", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={inv.shipper_paid || false}
                        onChange={(e) => handleFieldChange(inv.id, "shipper_paid", e.target.checked)}
                      />
                    </td>
                    <td>{inv.carrier}</td>
                    <td>
                      <input
                        className="oval-input"
                        type="number"
                        value={inv.carrier_pay || 0}
                        onChange={(e) => handleFieldChange(inv.id, "carrier_pay", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="oval-input"
                        type="text"
                        value={inv.carrier_terms || ""}
                        onChange={(e) => handleFieldChange(inv.id, "carrier_terms", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={inv.carrier_paid || false}
                        onChange={(e) => handleFieldChange(inv.id, "carrier_paid", e.target.checked)}
                      />
                    </td>
                    <td className="actual-net">${loadCash.toFixed(2)}</td>
                    <td>${projectedLoadCash.toFixed(2)}</td>
                    <td>{inv.flagged_reason || "—"}</td>
                    <td>
                      {inv.file_url ? (
                        <a href={inv.file_url} target="_blank" rel="noreferrer">View</a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dash-footer">© 2025 TallyHauls – All Rights Reserved</footer>
    </div>
  );
}
