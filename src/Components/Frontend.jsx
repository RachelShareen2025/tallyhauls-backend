// src/Components/Frontend.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  uploadInvoiceFile,
  computeKPIs,
  updateInvoiceStatus
} from "../features/Backend";
import "./Dashboard.css";

export default function Frontend({ userEmail }) {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const invoiceInputRef = useRef(null);

  // Fetch invoices
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching invoices:", error);
    else {
      const normalizedData = (data || []).map(inv => ({
        ...inv,
        total_charge: parseFloat(inv.total_charge) || 0,
        carrier_pay: parseFloat(inv.carrier_pay) || 0,
        bill_date: inv.bill_date ? new Date(inv.bill_date + "T00:00:00Z") : null,
        shipper_due: inv.shipper_due ? new Date(inv.shipper_due + "T00:00:00Z") : null,
        carrier_due: inv.carrier_due ? new Date(inv.carrier_due + "T00:00:00Z") : null,
        shipper_paid: !!inv.shipper_paid,
        carrier_paid: !!inv.carrier_paid
      }));
      setInvoices(normalizedData); // Fixed typo
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Handle invoice upload -> refresh list after upload
  const handleInvoiceUpload = async (file) => {
    await fetchInvoices();
  };

  // Toggle single paid checkbox
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

    const kpiList = [
      { label: "Projected Net Cash Flow", value: kpis.projectedCashFlow, dot: "green" },
      { label: "Actual Net Cash Flow", value: kpis.actualCashFlow, dot: "blue" },
      { label: "Total Receivables", value: kpis.totalReceivables, dot: "amber" },
      { label: "Total Payables", value: kpis.totalPayables, dot: "blue" },
      { label: "Overdue Shipper Amount", value: kpis.overdueShipperAmount, dot: "red" },
      { label: "Overdue Carrier Amount", value: kpis.overdueCarrierAmount, dot: "red" },
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

  const todayUTC = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ));

  return (
    <div className="card" style={{ margin: "0 24px 24px" }}>
      <div className="card-head table-head flex justify-between items-center">
        <h3>Invoices</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
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
                <td colSpan="13" style={{ textAlign: "center", padding: "16px" }}>
                  No invoices uploaded yet.
                </td>
              </tr>
            )}

            {filteredInvoices.map((inv) => {
              const netCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);

              // UTC-safe due dates
              const shipperDueDate = inv.shipper_due ? new Date(inv.shipper_due) : null;
              const carrierDueDate = inv.carrier_due ? new Date(inv.carrier_due) : null;

              const shipperTermsDisplay = shipperDueDate
                ? `Net 30 - ${shipperDueDate.toLocaleDateString()}`
                : "Net 30 - —";
              const carrierTermsDisplay = carrierDueDate
                ? `Net 15 - ${carrierDueDate.toLocaleDateString()}`
                : "Net 15 - —";

              // Overdue checks
              const isShipperOverdue = shipperDueDate && !inv.shipper_paid && shipperDueDate < todayUTC;
              const isCarrierOverdue = carrierDueDate && !inv.carrier_paid && carrierDueDate < todayUTC;

              return (
                <tr key={inv.id} className={isShipperOverdue || isCarrierOverdue ? "row-flagged" : ""}>
                  <td>{inv.load_number || "—"}</td>
                  <td>{inv.bill_date ? new Date(inv.bill_date).toLocaleDateString() : "—"}</td>
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
                  <td>{inv.flagged_reason || (isShipperOverdue ? "Past Due – Shipper" : isCarrierOverdue ? "Past Due – Carrier" : "—")}</td>
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

      <div className="quick-actions flex items-center gap-4 mb-4">
        {/* Upload CSV */}
        <UploadCSV onUpload={handleInvoiceUpload} brokerEmail={userEmail} ref={invoiceInputRef} />

        {/* Download Report button */}
        <button className="qa-btn" onClick={() => alert("Download Report feature coming soon!")}>
          Download Report
        </button>

        {/* Search invoices */}
        <Filters searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </div>

      <NetCashSummary kpis={kpis} />
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />
    </div>
  );
}
