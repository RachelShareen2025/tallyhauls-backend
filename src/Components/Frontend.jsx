// src/Components/Frontend.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  uploadInvoiceFile,
  computeKPIs,
  updateInvoiceStatus,
  bulkUpdateInvoiceStatus
} from "../features/Backend";
import "./Dashboard.css";

export default function Frontend({ userEmail }) {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [kpiStatus, setKpiStatus] = useState(null);
  const invoiceInputRef = useRef(null);

  // Fetch invoices once or refresh after upload
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching invoices:", error);
    else setInvoices(data || []);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // KPI status feedback
  useEffect(() => {
    if (invoices.length) {
      setKpiStatus("KPIs updated ✅");
      const timer = setTimeout(() => setKpiStatus(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [invoices]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Handle invoice upload -> refresh list after upload
  const handleInvoiceUpload = async (file) => {
    await fetchInvoices();
  };

  // Toggle row selection (Excel-style)
  const toggleRowSelection = (invoiceId) => {
    setSelectedRows((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  // Single paid checkbox update
  const handlePaidToggle = async (invoiceId, field, currentValue) => {
    // Optimistic UI update
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, [field]: !currentValue } : inv))
    );

    const res = await updateInvoiceStatus(invoiceId, field, !currentValue);
    if (!res.success) {
      // Revert on failure
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, [field]: currentValue } : inv))
      );
      alert(`Update failed: ${res.error}`);
    }
  };

  // Bulk paid update
  const handleBulkPaid = async (field) => {
    if (selectedRows.length === 0) return;

    // Optimistic UI update
    setInvoices((prev) =>
      prev.map((inv) => (selectedRows.includes(inv.id) ? { ...inv, [field]: true } : inv))
    );

    const res = await bulkUpdateInvoiceStatus(selectedRows, field, true);
    if (!res.success) {
      alert(`Bulk update failed: ${res.error}`);
      fetchInvoices(); // Refresh to correct state
    } else {
      setSelectedRows([]); // Clear selection
    }
  };

  // === Components ===
  const Filters = ({ searchQuery, onSearchChange }) => (
    <div className="quick-actions horizontal">
      <input
        type="text"
        placeholder="Search invoices..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );

  const UploadCSV = ({ onUpload, brokerEmail }) => {
    const fileInputRefInner = useRef(null);
    const [status, setStatus] = useState(null);

    const handleFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setStatus("Uploading...");
      try {
        const result = await uploadInvoiceFile(file, brokerEmail);
        if (result.success) {
          setStatus("✅ Uploaded successfully!");
          if (onUpload) onUpload(file);
        } else {
          setStatus(`❌ Upload failed: ${result.error}`);
        }
      } catch (err) {
        setStatus(`❌ Upload failed: ${err.message}`);
      }

      if (fileInputRefInner.current) fileInputRefInner.current.value = "";
    };

    return (
      <div className="quick-actions horizontal">
        <input
          type="file"
          ref={fileInputRefInner}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept=".csv"
        />
        <button className="qa-btn" onClick={() => fileInputRefInner.current?.click()}>
          Upload CSV
        </button>
        {status && <div className="upload-status">{status}</div>}
      </div>
    );
  };

  const NetCashSummary = ({ kpis }) => {
    if (!kpis) return null;
    const { projectedCashFlow, actualCashFlow, totalReceivables, totalPayables, overdueAmount } = kpis;

    const kpiList = [
      { label: "Projected Net Cash Flow", value: projectedCashFlow, dot: "green" },
      { label: "Actual Net Cash Flow", value: actualCashFlow, dot: "blue" },
      { label: "Total Receivables", value: totalReceivables, dot: "amber" },
      { label: "Total Payables", value: totalPayables, dot: "blue" },
      { label: "Overdue Amount", value: overdueAmount, dot: "red" },
    ];

    return (
      <div className="kpi-bar">
        {kpiList.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-top">
              <span className={`dot dot-${kpi.dot}`}></span> {kpi.label}
            </div>
            <div className={`kpi-value ${kpi.value < 0 ? "negative" : ""}`}>
              ${Number(kpi.value || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const InvoiceTable = ({ invoices, searchQuery }) => {
    if (!invoices) return null;

    const filteredInvoices = invoices.filter((inv) =>
      JSON.stringify(inv).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDueDate = (billDate, days) => {
      if (!billDate) return "—";
      const date = new Date(billDate);
      date.setDate(date.getDate() + days);
      return date.toLocaleDateString();
    };

    return (
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head flex justify-between items-center">
          <h3>Invoices</h3>
          <div className="bulk-actions">
            <button className="qa-btn" onClick={() => handleBulkPaid("shipper_paid")}>
              Mark Shipper Paid
            </button>
            <button className="qa-btn" onClick={() => handleBulkPaid("carrier_paid")}>
              Mark Carrier Paid
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Load #</th>
                <th>Bill Date</th>
                <th>Shipper</th>
                <th>Load Rate ($)</th>
                <th>Shipper Terms & Due</th>
                <th>Shipper Paid</th>
                <th>Carrier</th>
                <th>Carrier Pay ($)</th>
                <th>Carrier Terms & Due</th>
                <th>Carrier Paid</th>
                <th className="numeric">Net Cash</th>
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

              {filteredInvoices.map((inv) => {
                const netCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
                const billDate = inv.bill_date ? new Date(inv.bill_date) : null;
                const shipperTermsDisplay = billDate ? `Net 30 - ${formatDueDate(billDate, 30)}` : "Net 30 - —";
                const carrierTermsDisplay = billDate ? `Net 15 - ${formatDueDate(billDate, 15)}` : "Net 15 - —";
                const isSelected = selectedRows.includes(inv.id);

                return (
                  <tr key={inv.id} className={inv.flagged_reason ? "row-flagged" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(inv.id)}
                      />
                    </td>
                    <td>{inv.load_number || "—"}</td>
                    <td>{billDate ? billDate.toLocaleDateString() : "—"}</td>
                    <td>{inv.shipper || "—"}</td>
                    <td style={{ textAlign: "center" }}>{Number(inv.total_charge || 0).toFixed(2)}</td>
                    <td>{shipperTermsDisplay}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={inv.shipper_paid || false}
                        className={inv.shipper_paid ? "paid-green" : ""}
                        onChange={() => handlePaidToggle(inv.id, "shipper_paid", inv.shipper_paid)}
                      />
                    </td>
                    <td>{inv.carrier || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      {inv.carrier_pay !== null && inv.carrier_pay !== undefined
                        ? Number(inv.carrier_pay).toFixed(2)
                        : "—"}
                    </td>
                    <td>{carrierTermsDisplay}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={inv.carrier_paid || false}
                        className={inv.carrier_paid ? "paid-green" : ""}
                        onChange={() => handlePaidToggle(inv.id, "carrier_paid", inv.carrier_paid)}
                      />
                    </td>
                    <td className="numeric">${netCash.toFixed(2)}</td>
                    <td>{inv.flagged_reason || "—"}</td>
                    <td>
                      {inv.file_url ? (
                        <a href={inv.file_url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Memoize KPI calculations
  const kpis = useMemo(() => computeKPIs(invoices), [invoices]);

  return (
    <div className="dashboard-container p-4">
      <header className="dashboard-header flex justify-between items-center mb-4">
        <img src="/logo.png" alt="TallyHauls" className="logo h-10" />
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="quick-actions flex gap-4 mb-4">
        <UploadCSV onUpload={handleInvoiceUpload} brokerEmail={userEmail} ref={invoiceInputRef} />
        <Filters searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </div>

      <NetCashSummary kpis={kpis} />
      {kpiStatus && <div className="upload-status">{kpiStatus}</div>}
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />
    </div>
  );
}
