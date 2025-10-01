// src/Components/Frontend.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  uploadInvoiceFile,
  updateInvoiceStatus,
  fetchInvoicesPaginated,
  fetchKPIs,
} from "../features/Backend";
import { getFlaggedReason } from "../features/flaggedReasons";
import "./Dashboard.css";

export default function Frontend() {
  const [session, setSession] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [csvDownloading, setCsvDownloading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [lastCursor, setLastCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [kpis, setKpis] = useState({
    projectedCashFlow: 0,
    actualCashFlow: 0,
    totalReceivables: 0,
    totalPayables: 0,
    overdueShipperAmount: 0,
    overdueCarrierAmount: 0,
  });

  // --- Auth session setup (updated for new Supabase client) ---
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
    };
    fetchSession();

    const { subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user;

  // --- Load KPIs ---
  useEffect(() => {
    if (!user) return;

    const loadKPIs = async () => {
      const res = await fetchKPIs(user);
      if (res.success) setKpis(res.kpis);
      else console.error("Failed to fetch KPIs:", res.error);
    };
    loadKPIs();
  }, [invoices, user]);

  // --- Precompute flagged reasons ---
  const flaggedReasonMap = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      map[inv.id] = getFlaggedReason(inv, invoices);
    });
    return map;
  }, [invoices]);

  // --- Fetch invoices ---
  const fetchInvoices = async (reset = false) => {
    if (!user || loadingInvoices) return;
    setLoadingInvoices(true);
    try {
      const cursor = reset ? null : lastCursor;
      const pageSize = 50;
      const res = await fetchInvoicesPaginated(user, pageSize, cursor);

      if (res.success) {
        const normalizedData = (res.data || []).map(inv => ({
          ...inv,
          total_charge: parseFloat(inv.total_charge || 0),
          carrier_pay: parseFloat(inv.carrier_pay || 0),
          bill_date: inv.bill_date ? new Date(inv.bill_date + "T00:00:00Z") : null,
          shipper_due: inv.shipper_due ? new Date(inv.shipper_due + "T00:00:00Z") : null,
          carrier_due: inv.carrier_due ? new Date(inv.carrier_due + "T00:00:00Z") : null,
          shipper_paid: !!inv.shipper_paid,
          carrier_paid: !!inv.carrier_paid,
        }));

        setInvoices(prev => (reset ? normalizedData : [...prev, ...normalizedData]));
        setLastCursor(res.nextCursor);
        setHasMore(res.nextCursor !== null);
      } else {
        console.error("Error fetching invoices:", res.error);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    }
    setLoadingInvoices(false);
  };

  // --- Logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // --- Refresh after upload ---
  const handleInvoiceUpload = async () => {
    await fetchInvoices(true);
  };

  // --- Toggle paid checkbox ---
  const handlePaidToggle = async (invoiceId, field, currentValue) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, [field]: !currentValue } : inv
    );
    setInvoices(updatedInvoices);

    const res = await updateInvoiceStatus(invoiceId, field, !currentValue, user);
    if (!res.success) {
      setInvoices(invoices);
      alert(`Update failed: ${res.error}`);
    }
  };

  if (!session) return <div>Loading...</div>;

  // --- Components ---
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

  const UploadCSV = ({ onUpload }) => {
    const fileInputRefInner = useRef(null);

    const handleFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setUploadStatus("Uploading...");
      try {
        const result = await uploadInvoiceFile(file, user); // ✅ pass user session
        if (result.success) {
          setUploadStatus("✅ Uploaded successfully!");
          if (onUpload) onUpload();
        } else {
          setUploadStatus(`❌ Upload failed: ${result.error}`);
        }
      } catch (err) {
        setUploadStatus(`❌ Upload failed: ${err.message}`);
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
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
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

    const formatDue = (date) => (date ? new Date(date).toLocaleDateString() : "—");

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
      const aFullyPaid = a.shipper_paid && a.carrier_paid;
      const bFullyPaid = b.shipper_paid && b.carrier_paid;

      if (aFullyPaid && !bFullyPaid) return 1;
      if (!aFullyPaid && bFullyPaid) return -1;

      const aDate = a.bill_date ? new Date(a.bill_date) : new Date(0);
      const bDate = b.bill_date ? new Date(b.bill_date) : new Date(0);
      return aDate - bDate;
    });

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
              {sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", padding: "16px" }}>
                    No invoices uploaded yet.
                  </td>
                </tr>
              )}
              {sortedInvoices.map((inv) => {
                const netCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
                const shipperTermsDisplay = inv.shipper_due
                  ? `Net 30 - ${formatDue(inv.shipper_due)}`
                  : "Net 30 - —";
                const carrierTermsDisplay = inv.carrier_due
                  ? `Net 15 - ${formatDue(inv.carrier_due)}`
                  : "Net 15 - —";

                const flaggedReason = flaggedReasonMap[inv.id];
                const rowClass = flaggedReason ? "row-flagged" : "";

                return (
                  <tr key={inv.id} className={rowClass}>
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
                    <td style={{ textAlign: "center" }}>{Number(inv.carrier_pay || 0).toFixed(2)}</td>
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
                    <td>{flaggedReason || "—"}</td>
                    <td>{inv.file_url ? <a href={inv.file_url} target="_blank" rel="noreferrer">View</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const downloadReport = async () => {
    if (!invoices || invoices.length === 0) return alert("No invoices to download.");

    setCsvDownloading(true);
    try {
      const { downloadCSV } = await import("../features/exportCSV");
      downloadCSV(invoices, `TallyHauls_Report_${new Date().toISOString()}.csv`);
    } catch (err) {
      console.error("CSV download failed:", err);
      alert("CSV download failed: " + err.message);
    }
    setCsvDownloading(false);
  };

  return (
    <div className="dashboard-container p-4">
      <header className="dashboard-header flex justify-between items-center mb-4">
        <img src="/logo.png" alt="TallyHauls" className="logo h-10" />
        <div>
          <span style={{ marginRight: "16px" }}>Logged in as: {user?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="quick-actions flex items-center gap-4 mb-4">
        <UploadCSV onUpload={handleInvoiceUpload} />
        <button className="qa-btn" onClick={fetchInvoices} disabled={!hasMore || loadingInvoices}>
          {loadingInvoices ? "Loading..." : hasMore ? "Load More" : "All Loaded"}
        </button>
        <button className="qa-btn" onClick={downloadReport} disabled={csvDownloading}>
          {csvDownloading ? "Downloading..." : "Download CSV"}
        </button>
      </div>

      <Filters searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <NetCashSummary kpis={kpis} />
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />
    </div>
  );
}
