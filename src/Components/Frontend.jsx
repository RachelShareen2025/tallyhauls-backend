// src/Components/Frontend.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  uploadInvoiceFile,
  computeKPIs,
  updateInvoiceStatus
} from "../features/Backend";
import "./Dashboard.css";

export default function Frontend({ userEmail }) {
  const [invoices, setInvoices] = useState([]);
  const [kpis, setKpis] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

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
      setInvoices(normalizedData);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Recompute KPIs whenever invoices change
  useEffect(() => {
    if (invoices.length > 0) {
      setKpis(computeKPIs(invoices));
    } else {
      setKpis({
        projectedCashFlow: 0,
        actualCashFlow: 0,
        totalReceivables: 0,
        totalPayables: 0,
        overdueShipperAmount: 0,
        overdueCarrierAmount: 0
      });
    }
  }, [invoices]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Refresh invoice list after upload
  const handleInvoiceUpload = async (file) => {
    await fetchInvoices();
  };

  // Toggle single paid checkbox
  const handlePaidToggle = async (invoiceId, field, currentValue) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, [field]: !currentValue } : inv
    );
    setInvoices(updatedInvoices);

    const res = await updateInvoiceStatus(invoiceId, field, !currentValue);
    if (!res.success) {
      setInvoices(invoices);
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

  const NetCashSummary = ({ invoices }) => {
  if (!invoices || invoices.length === 0) return null;

  const projectedCashFlow = invoices.reduce((sum, inv) => sum + (inv.total_charge || 0), 0);
  const actualCashFlow = invoices.reduce(
    (sum, inv) => sum + ((inv.shipper_paid ? inv.total_charge : 0) - (inv.carrier_paid ? inv.carrier_pay : 0)),
    0
  );
  const totalReceivables = invoices.reduce((sum, inv) => sum + (inv.total_charge || 0), 0);
  const totalPayables = invoices.reduce((sum, inv) => sum + (inv.carrier_pay || 0), 0);
  const overdueShipperAmount = invoices.reduce(
    (sum, inv) => sum + ((inv.shipper_due && !inv.shipper_paid) ? (inv.total_charge || 0) : 0),
    0
  );
  const overdueCarrierAmount = invoices.reduce(
    (sum, inv) => sum + ((inv.carrier_due && !inv.carrier_paid) ? (inv.carrier_pay || 0) : 0),
    0
  );

  const kpiList = [
    { label: "Projected Net Cash Flow", value: projectedCashFlow, dot: "green" },
    { label: "Actual Net Cash Flow", value: actualCashFlow, dot: "blue" },
    { label: "Total Receivables", value: totalReceivables, dot: "amber" },
    { label: "Total Payables", value: totalPayables, dot: "blue" },
    { label: "Overdue Shipper Amount", value: overdueShipperAmount, dot: "red" },
    { label: "Overdue Carrier Amount", value: overdueCarrierAmount, dot: "red" },
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

    const formatDue = (date) => date ? new Date(date).toLocaleDateString() : "—";

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
    
    const shipperTermsDisplay = inv.shipper_due
      ? `Net 30 - ${formatDue(inv.shipper_due)}`
      : "Net 30 - —";

    const carrierTermsDisplay = inv.carrier_due
      ? `Net 15 - ${formatDue(inv.carrier_due)}`
      : "Net 15 - —";

    return (
      <tr key={inv.id} className={
          inv.flagged_reason && !(inv.shipper_paid && inv.carrier_paid) ? "row-flagged" : ""
        }>
        <td>{inv.load_number || "—"}</td>
        <td>{inv.bill_date ? formatDue(inv.bill_date) : "—"}</td>
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

  {/* Totals row */}
 {/* Totals row */}
{invoices.length > 0 && (
  <tr style={{ fontWeight: "bold", backgroundColor: "#f9f9f9" }}>
    <td colSpan="3" style={{ textAlign: "right"}}>Totals:</td>
    <td style={{ textAlign: "center" }}>
      ${filteredInvoices.reduce((sum, inv) => sum + (inv.total_charge || 0), 0).toFixed(2)}
    </td>
    <td></td>
    <td></td>
    <td></td>
    <td style={{ textAlign: "center" }}>
      ${filteredInvoices.reduce((sum, inv) => sum + (inv.carrier_pay || 0), 0).toFixed(2)}
    </td>
    <td></td>
    <td></td>
    <td className="numeric">
      ${filteredInvoices.reduce((sum, inv) => sum + ((inv.total_charge || 0) - (inv.carrier_pay || 0)), 0).toFixed(2)}
    </td>
    <td>
      ${filteredInvoices.reduce((sum, inv) => sum + ((inv.shipper_due && !inv.shipper_paid) ? (inv.total_charge || 0) : 0), 0).toFixed(2)}
    </td>
    <td>
      ${filteredInvoices.reduce((sum, inv) => sum + ((inv.carrier_due && !inv.carrier_paid) ? (inv.carrier_pay || 0) : 0), 0).toFixed(2)}
    </td>
  </tr>
)}

</tbody>

          </table>
        </div>
      </div>
    );
  };
  // ======================
  // Download CSV / Report
  // ======================
  const downloadReport = () => {
    if (!invoices || invoices.length === 0) return alert("No invoices to download.");

    const escapeCSV = (text) => `"${String(text || "").replace(/"/g, '""')}"`;

    const headers = [
      "Load #", "Bill Date", "Shipper", "Load Rate ($)", "Shipper Terms & Due",
      "Shipper Paid", "Carrier", "Carrier Pay ($)", "Carrier Terms & Due",
      "Carrier Paid", "Net Cash", "Flagged Reason", "File"
    ];

    const rows = invoices.map(inv => [
      escapeCSV(inv.load_number),
      escapeCSV(inv.bill_date ? new Date(inv.bill_date).toLocaleDateString() : ""),
      escapeCSV(inv.shipper),
      (inv.total_charge || 0).toFixed(2),
      escapeCSV(`Net 30 - ${inv.shipper_due ? new Date(inv.shipper_due).toLocaleDateString() : ""}`),
      inv.shipper_paid ? "Yes" : "No",
      escapeCSV(inv.carrier),
      (inv.carrier_pay || 0).toFixed(2),
      escapeCSV(`Net 15 - ${inv.carrier_due ? new Date(inv.carrier_due).toLocaleDateString() : ""}`),
      inv.carrier_paid ? "Yes" : "No",
      ((inv.total_charge || 0) - (inv.carrier_pay || 0)).toFixed(2),
      escapeCSV(inv.flagged_reason),
      escapeCSV(inv.file_url)
    ]);

    // KPI summary block (Option B)
    const kpiRows = [
      ["", "", "KPIs"],
      ["Projected Net Cash Flow", kpis.projectedCashFlow.toFixed(2)],
      ["Actual Net Cash Flow", kpis.actualCashFlow.toFixed(2)],
      ["Total Receivables", kpis.totalReceivables.toFixed(2)],
      ["Total Payables", kpis.totalPayables.toFixed(2)],
      ["Overdue Shipper Amount", kpis.overdueShipperAmount.toFixed(2)],
      ["Overdue Carrier Amount", kpis.overdueCarrierAmount.toFixed(2)]
    ];

    const csvContent = [headers, ...rows, [], ...kpiRows]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `TallyHauls_Report_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container p-4">
      <header className="dashboard-header flex justify-between items-center mb-4">
        <img src="/logo.png" alt="TallyHauls" className="logo h-10" />
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="quick-actions flex items-center gap-4 mb-4">
        <UploadCSV onUpload={handleInvoiceUpload} brokerEmail={userEmail} />
        <button className="qa-btn" onClick={downloadReport}>
          Download Report
        </button>
        <Filters searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </div>

      <NetCashSummary invoices={filteredInvoices || invoices} />
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />
    </div>
  );
}

 
