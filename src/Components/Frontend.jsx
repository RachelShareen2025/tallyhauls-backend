// src/Components/Frontend.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  uploadInvoiceFile,
  updateInvoiceStatus,
  fetchInvoicesPaginated,
  fetchKPIsForBroker,
} from "../features/Backend";
import "./Dashboard.css";

export default function Frontend() {
  const [session, setSession] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null);
  const [lastCursor, setLastCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [csvDownloading, setCsvDownloading] = useState(false);
  const [kpis, setKpis] = useState({
    projectedCashFlow: 0,
    actualCashFlow: 0,
    totalReceivables: 0,
    totalPayables: 0,
    overdueShipperAmount: 0,
    overdueCarrierAmount: 0,
  });

  const user = session?.user;

  // --- Auth session setup (fixed) ---
useEffect(() => {
  const initSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
        // ⚡ Set JWT explicitly for RLS
        await supabase.auth.setAuth(data.session.access_token);
      }
    } catch (err) {
      console.error("Failed to get session:", err);
    }
  };
  initSession();

  const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
    setSession(newSession);
    if (newSession) {
      // ⚡ Set JWT explicitly every time session changes
      await supabase.auth.setAuth(newSession.access_token);
    }
  });

  return () => listener.subscription.unsubscribe();
}, []);


  // --- Fetch invoices ---
  const fetchInvoices = useCallback(
    async (reset = false) => {
      if (!user || loadingInvoices) return;
      setLoadingInvoices(true);
      try {
        const cursor = reset ? null : lastCursor;
        const res = await fetchInvoicesPaginated(user, 50, cursor);
        if (res.success) {
          const normalized = (res.data || []).map(inv => ({
            ...inv,
            total_charge: +inv.total_charge || 0,
            carrier_pay: +inv.carrier_pay || 0,
            bill_date: inv.bill_date ? new Date(inv.bill_date + "T00:00:00Z") : null,
            shipper_due: inv.shipper_due ? new Date(inv.shipper_due + "T00:00:00Z") : null,
            carrier_due: inv.carrier_due ? new Date(inv.carrier_due + "T00:00:00Z") : null,
            shipper_paid: !!inv.shipper_paid,
            carrier_paid: !!inv.carrier_paid,
          }));
          setInvoices(prev => (reset ? normalized : [...prev, ...normalized]));
          setLastCursor(res.nextCursor);
          setHasMore(res.nextCursor !== null);
        } else console.error("Error fetching invoices:", res.error);
      } catch (err) {
        console.error("Error fetching invoices:", err);
      }
      setLoadingInvoices(false);
    },
    [user, loadingInvoices, lastCursor]
  );

  // --- Fetch KPIs ---
  const loadKPIs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchKPIsForBroker(user);
      if (res.success) setKpis(res.kpis);
      else console.error("Failed to fetch KPIs:", res.error);
    } catch (err) {
      console.error("Error loading KPIs:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchInvoices(true);
    loadKPIs();
  }, [user, fetchInvoices, loadKPIs]);


  // --- Refresh after upload ---
  const handleInvoiceUpload = async () => {
    await fetchInvoices(true);
    await loadKPIs();
  };

  // --- Toggle paid checkbox ---
  const handlePaidToggle = async (invoiceId, field, currentValue) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, [field]: !currentValue } : inv
    );
    setInvoices(updatedInvoices);

    try {
      const res = await updateInvoiceStatus(invoiceId, field, !currentValue, user);
      if (!res.success) {
        setInvoices(invoices); // revert if failed
        alert(`Update failed: ${res.error}`);
      } else {
        await loadKPIs();
      }
    } catch (err) {
      setInvoices(invoices); // revert
      alert(`Update failed: ${err.message}`);
    }
  };

  // --- Logout ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // --- Upload CSV Component ---
  const UploadCSV = () => {
    const fileInputRef = useRef(null);
    const handleFileChange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      setUploadStatus("Uploading...");
      try {
        const result = await uploadInvoiceFile(file, user);
        setUploadStatus(result.success ? "✅ Uploaded successfully!" : `❌ Upload failed: ${result.error}`);
        await handleInvoiceUpload();
      } catch (err) {
        setUploadStatus(`❌ Upload failed: ${err.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    return (
      <div className="quick-actions horizontal">
        <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} accept=".csv" />
        <button className="qa-btn" onClick={() => fileInputRef.current?.click()}>Upload CSV</button>
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
      </div>
    );
  };

  // --- Filters Component ---
  const Filters = () => (
    <div className="quick-actions horizontal">
      <input
        type="text"
        placeholder="Search invoices..."
        className="search-bar"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
    </div>
  );

  // --- KPI Summary Component ---
  const NetCashSummary = ({ kpis }) => {
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
        {kpiList.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-top"><span className={`dot dot-${kpi.dot}`}></span> {kpi.label}</div>
            <div className={`kpi-value ${kpi.value < 0 ? "negative" : ""}`}>${kpi.value.toFixed(2)}</div>
          </div>
        ))}
      </div>
    );
  };

  // --- Invoice Table Component ---
  const InvoiceTable = ({ invoices, searchQuery }) => {
    const filtered = invoices.filter(inv =>
      inv.load_number?.toString().includes(searchQuery) ||
      inv.shipper?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.carrier?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const aPaid = a.shipper_paid && a.carrier_paid;
      const bPaid = b.shipper_paid && b.carrier_paid;
      if (aPaid && !bPaid) return 1;
      if (!aPaid && bPaid) return -1;
      return (a.bill_date || 0) - (b.bill_date || 0);
    });

    const formatDate = d => (d ? new Date(d).toLocaleDateString() : "—");

    return (
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head flex justify-between items-center"><h3>Invoices</h3></div>
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
              {sorted.length === 0 ? (
                <tr><td colSpan="13" style={{ textAlign: "center", padding: "16px" }}>No invoices uploaded yet.</td></tr>
              ) : sorted.map(inv => {
                const netCash = inv.total_charge - inv.carrier_pay;
                const shipperTerms = `Net 30 - ${formatDate(inv.shipper_due)}`;
                const carrierTerms = `Net 15 - ${formatDate(inv.carrier_due)}`;
                const flaggedReason = inv.flagged_reason;
                const rowClass = flaggedReason ? "row-flagged" : "";

                return (
                  <tr key={inv.id} className={rowClass}>
                    <td>{inv.load_number || "—"}</td>
                    <td>{formatDate(inv.bill_date)}</td>
                    <td>{inv.shipper || "—"}</td>
                    <td style={{ textAlign: "center" }}>{inv.total_charge.toFixed(2)}</td>
                    <td>{shipperTerms}</td>
                    <td>
                      <input type="checkbox" checked={inv.shipper_paid} className={inv.shipper_paid ? "paid-green" : ""} 
                             onChange={() => handlePaidToggle(inv.id, "shipper_paid", inv.shipper_paid)} />
                    </td>
                    <td>{inv.carrier || "—"}</td>
                    <td style={{ textAlign: "center" }}>{inv.carrier_pay.toFixed(2)}</td>
                    <td>{carrierTerms}</td>
                    <td>
                      <input type="checkbox" checked={inv.carrier_paid} className={inv.carrier_paid ? "paid-green" : ""} 
                             onChange={() => handlePaidToggle(inv.id, "carrier_paid", inv.carrier_paid)} />
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

  // --- Download CSV ---
  const downloadReport = async () => {
    if (!invoices.length) return alert("No invoices to download.");
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

  if (!session) return <div>Loading...</div>;

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
        <UploadCSV />
        <button className="qa-btn" onClick={downloadReport} disabled={csvDownloading}>
          {csvDownloading ? "Please wait..." : "Download Report"}
        </button>
        <Filters />
      </div>

      <NetCashSummary kpis={kpis} />
      <InvoiceTable invoices={invoices} searchQuery={searchQuery} />

      {hasMore && (
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <button onClick={() => fetchInvoices()} disabled={loadingInvoices}>
            {loadingInvoices ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
