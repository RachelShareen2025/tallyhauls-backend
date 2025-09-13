// src/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Compute KPIs
  const computeKPIs = () => {
    let totalReceivables = 0;
    let totalPayables = 0;
    let projectedCashFlow = 0;
    let actualCashFlow = 0;
    let overdueAmount = 0;

    invoices.forEach((inv) => {
      const totalCharge = Number(inv.total_charge || 0);
      const carrierPay = Number(inv.carrier_pay || 0);

      totalReceivables += !inv.shipper_paid ? totalCharge : 0;
      totalPayables += !inv.carrier_paid ? carrierPay : 0;

      projectedCashFlow += !inv.shipper_paid ? totalCharge - carrierPay : 0;

      if (inv.shipper_paid && inv.carrier_paid) {
        actualCashFlow += totalCharge - carrierPay;
      }

      const today = new Date();
      const shipperDue = inv.bill_date && inv.shipper_terms
        ? new Date(new Date(inv.bill_date).getTime() + inv.shipper_terms * 86400000)
        : null;
      const carrierDue = inv.bill_date && inv.carrier_terms
        ? new Date(new Date(inv.bill_date).getTime() + inv.carrier_terms * 86400000)
        : null;

      if (
        (!inv.shipper_paid && shipperDue && shipperDue < today) ||
        (!inv.carrier_paid && carrierDue && carrierDue < today)
      ) {
        overdueAmount += totalCharge;
      }
    });

    return { projectedCashFlow, actualCashFlow, totalReceivables, totalPayables, overdueAmount };
  };

  const { projectedCashFlow, actualCashFlow, totalReceivables, totalPayables, overdueAmount } = computeKPIs();

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) =>
    JSON.stringify(inv).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-green"></span> Projected Net Cash Flow
          </div>
          <div className={`kpi-value ${projectedCashFlow < 0 ? "negative" : ""}`}>
            ${projectedCashFlow.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-blue"></span> Actual Net Cash Flow
          </div>
          <div className={`kpi-value ${actualCashFlow < 0 ? "negative" : ""}`}>
            ${actualCashFlow.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-amber"></span> Total Receivables
          </div>
          <div className="kpi-value">${totalReceivables.toFixed(2)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-blue"></span> Total Payables
          </div>
          <div className="kpi-value">${totalPayables.toFixed(2)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="dot dot-red"></span> Overdue Amount
          </div>
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
        <button className="qa-btn" onClick={() => invoiceInputRef.current?.click()}>
          Upload CSV
        </button>
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
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", padding: "16px" }}>
                    No invoices uploaded yet.
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => {
                const loadCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
                return (
                  <tr key={inv.id} className={inv.flagged_reason ? "row-flagged" : ""}>
                    <td>{inv.load_number || "—"}</td>
                    <td>{inv.bill_date ? new Date(inv.bill_date).toLocaleDateString() : "—"}</td>
                    <td>{inv.shipper}</td>
                    <td className="numeric">{Number(inv.total_charge || 0).toFixed(2)}</td>
                    <td>{inv.shipper_terms || "—"}</td>
                    <td>
                      <input type="checkbox" checked={inv.shipper_paid || false} readOnly />
                    </td>
                    <td>{inv.carrier}</td>
                    <td>
                      <input type="number" value={inv.carrier_pay || 0} readOnly />
                    </td>
                    <td>{inv.carrier_terms || "—"}</td>
                    <td>
                      <input type="checkbox" checked={inv.carrier_paid || false} readOnly />
                    </td>
                    <td className="numeric">${loadCash.toFixed(2)}</td>
                    <td>{inv.flagged_reason || "—"}</td>
                    <td>
                      {inv.file_url ? (
                        <a href={inv.file_url} target="_blank" rel="noreferrer">
                          View
                        </a>
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
