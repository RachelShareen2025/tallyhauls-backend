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
  const [kpis, setKpis] = useState({});
  const fileInputRef = useRef(null);

  // Fetch invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      let { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
      } else {
        setInvoices(data || []);
      }
    };

    fetchInvoices();
  }, []);

  // Compute KPIs whenever invoices change
  useEffect(() => {
    if (invoices.length > 0) {
      const kpiResults = computeKPIs(invoices);
      setKpis(kpiResults);
    }
  }, [invoices]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const { invoices: newInvoices, error } = await uploadInvoiceFile(file, userEmail);

    if (error) {
      console.error("Upload error:", error);
      return;
    }

    setInvoices((prev) => [...newInvoices, ...prev]);
  };

  const handlePaidToggle = async (invoiceId, field, currentValue) => {
    const newValue = !currentValue;
    const { error } = await updateInvoiceStatus(invoiceId, field, newValue);

    if (error) {
      console.error("Error updating invoice:", error);
      return;
    }

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, [field]: newValue } : inv
      )
    );
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>TallyHauls Dashboard</h2>
        <div className="dashboard-actions">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="upload-btn"
          >
            Upload CSV
          </button>
          <input
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button className="download-btn">Download Report</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {Object.entries(kpis).map(([key, value]) => (
          <div key={key} className="kpi-card">
            <h4>{key}</h4>
            <p>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoice Table */}
      <InvoiceTable
        invoices={invoices}
        searchQuery={searchQuery}
        formatDate={formatDate}
        handlePaidToggle={handlePaidToggle}
      />
    </div>
  );
}

const InvoiceTable = ({ invoices, searchQuery, formatDate, handlePaidToggle }) => {
  if (!invoices) return null;

  const filteredInvoices = invoices.filter((inv) =>
    JSON.stringify(inv).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              const netCash =
                Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);

              const shipperTermsDisplay = inv.shipper_due
                ? `${inv.shipper_terms} - ${formatDate(inv.shipper_due)}`
                : `${inv.shipper_terms || "Net ?"} - —`;

              const carrierTermsDisplay = inv.carrier_due
                ? `${inv.carrier_terms} - ${formatDate(inv.carrier_due)}`
                : `${inv.carrier_terms || "Net ?"} - —`;

              return (
                <tr
                  key={inv.id}
                  className={
                    inv.flagged_reason && !(inv.shipper_paid && inv.carrier_paid)
                      ? "row-flagged"
                      : ""
                  }
                >
                  <td>{inv.load_number || "—"}</td>
                  <td>{inv.bill_date ? formatDate(inv.bill_date) : "—"}</td>
                  <td>{inv.shipper || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    {Number(inv.total_charge || 0).toFixed(2)}
                  </td>
                  <td>{shipperTermsDisplay}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={inv.shipper_paid || false}
                      className={inv.shipper_paid ? "paid-green" : ""}
                      onChange={() =>
                        handlePaidToggle(inv.id, "shipper_paid", inv.shipper_paid)
                      }
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
                      onChange={() =>
                        handlePaidToggle(
                          inv.id,
                          "carrier_paid",
                          inv.carrier_paid
                        )
                      }
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
