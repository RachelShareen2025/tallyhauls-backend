import React, { useMemo, useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient"; // <-- updated path (Dashboard.jsx is in src/Pages)

export default function Dashboard() {
  // ---------- state & refs (hooks must remain in stable order) ----------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("last7");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecureMsg, setShowSecureMsg] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);

  const fileInputRef = useRef(null);

  // ---------- Auth check ----------
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.session) {
          setUser(data.session.user);
          setShowSecureMsg(true);
          setTimeout(() => setShowSecureMsg(false), 3000);
        } else {
          window.location.href = "/";
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Session error:", err);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session) {
        setShowSecureMsg(true);
        setTimeout(() => setShowSecureMsg(false), 3000);
      } else {
        window.location.href = "/";
      }
    });

    return () => {
      mounted = false;
      try { listener.subscription.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, []);

  // ---------- Initial data load (Supabase if available, fallback to mock) ----------
  useEffect(() => {
    (async () => {
      try {
        const { data: invs, error: invErr } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(200);
        if (!invErr && invs && invs.length > 0) {
          setInvoices(invs.map(row => ({
            id: row.id ?? row.invoice_number ?? `INV-${Math.floor(Math.random()*100000)}`,
            carrier: row.carrier ?? row.client ?? "Unknown",
            amount: typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0,
            status: row.status ?? "Pending",
            date: row.date ? (String(row.date).split("T")[0]) : (row.created_at ? String(row.created_at).split("T")[0] : new Date().toISOString().slice(0,10))
          })));
        } else {
          // fallback mock
          setInvoices([
            { id: "INV-10124", carrier: "Swift Logistics", amount: 1250.0, status: "Pending", date: "2025-08-20" },
            { id: "INV-10125", carrier: "RoadRunner",     amount: 980.5,  status: "Cleared", date: "2025-08-18" },
            { id: "INV-10126", carrier: "Atlas Carriers",  amount: 1600.0, status: "Error",   date: "2025-08-22" },
            { id: "INV-10127", carrier: "BlueLine",        amount: 715.0,  status: "Pending", date: "2025-08-21" },
            { id: "INV-10128", carrier: "Nexus Freight",   amount: 2100.0, status: "Cleared", date: "2025-08-19" },
            { id: "INV-10129", carrier: "ExpressHaul",     amount: 1430.0, status: "Error",   date: "2025-08-16" },
            { id: "INV-10130", carrier: "Prime Movers",    amount: 890.0,  status: "Cleared", date: "2025-08-23" },
          ]);
        }

        // activity
        const { data: acts } = await supabase.from("user_activity").select("*").order("timestamp", { ascending: false }).limit(50);
        if (acts && acts.length > 0) {
          setActivity(acts.map(a => ({ time: new Date(a.timestamp).toLocaleString(), text: a.action })));
        } else {
          setActivity([
            { time: "2h ago", text: "Invoice INV-10130 reconciled and cleared." },
            { time: "4h ago", text: "Rate mismatch flagged on INV-10126." },
            { time: "Yesterday", text: "3 invoices auto-matched to loads." },
            { time: "2 days ago", text: "Payment confirmation received from BlueLine." },
          ]);
        }

        // discrepancies
        const { data: dis } = await supabase.from("discrepancies").select("*").order("created_at", { ascending: false }).limit(100);
        if (dis && dis.length > 0) {
          setDiscrepancies(dis.map(d => ({ id: d.invoice_id ?? d.invoice_number ?? d.id, type: d.type, severity: d.severity ?? "medium" })));
        } else {
          setDiscrepancies([
            { id: "INV-10126", type: "Rate mismatch", severity: "high" },
            { id: "INV-10129", type: "Missing POD", severity: "medium" },
            { id: "INV-10107", type: "Duplicate invoice", severity: "low" },
          ]);
        }
      } catch (err) {
        console.error("Initial load failed, using fallback mocks:", err);
      } finally {
        // don't change loading here; auth useEffect controls it
      }
    })();
  }, []);

  // ---------- Utility: unified tracker (updates UI and attempts to persist) ----------
  const trackAction = async (actionText) => {
    const time = "Just now";
    setActivity(prev => [{ time, text: actionText }, ...prev].slice(0, 50));
    if (!user) return;
    try {
      await supabase.from("user_activity").insert([{ user_id: user.id, action: actionText }]);
    } catch (err) {
      console.error("trackAction supabase error:", err);
    }
  };

  // ---------- Auth / Logout ----------
  const handleLogout = async () => {
    trackAction("Logged out");
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    setUser(null);
    window.location.href = "/";
  };

  // ---------- Approve & Flag (optimistic UI first, persist later) ----------
  const handleApprove = async (invoiceId) => {
    // optimistic UI update
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'Cleared' } : i));
    setDiscrepancies(prev => prev.filter(d => d.id !== invoiceId));
    trackAction(`Approved invoice ${invoiceId}`);

    // persist to Supabase (background)
    try {
      await supabase.from("invoices").update({ status: "Cleared", updated_at: new Date().toISOString() }).eq("id", invoiceId);
      if (user) await supabase.from("user_activity").insert([{ user_id: user.id, action: `Approved invoice ${invoiceId}` }]);
    } catch (err) {
      console.error("Failed to persist approve:", err);
      // optionally: add rollback logic here if persistence fails
    }
  };

  const handleFlag = async (invoiceId) => {
    // optimistic add if not present
    setDiscrepancies(prev => {
      if (!prev.find(d => d.id === invoiceId)) {
        return [{ id: invoiceId, type: "Flagged", severity: "medium" }, ...prev];
      }
      return prev;
    });
    trackAction(`Flagged invoice ${invoiceId}`);

    try {
      await supabase.from("discrepancies").insert([{ invoice_id: invoiceId, type: "Flagged", severity: "medium", user_id: user?.id }]);
      if (user) await supabase.from("user_activity").insert([{ user_id: user.id, action: `Flagged invoice ${invoiceId}` }]);
    } catch (err) {
      console.error("Failed to persist flag:", err);
    }
  };

  // ---------- CSV parser & file upload (CSV + OCR placeholder) ----------
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);
    return rows.map(row => {
      const cols = row.split(",").map(c => c.trim());
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = cols[i] ?? "";
      return {
        id: obj.id || obj.invoice_number || `INV-${Math.floor(Math.random()*100000)}`,
        carrier: obj.carrier || obj.client || "Unknown",
        amount: parseFloat(obj.amount || obj.total || "0") || 0,
        status: obj.status || "Pending",
        date: (obj.date || new Date().toISOString().slice(0,10)).slice(0,10),
      };
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    // CSV handling
    if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
      try {
        const text = await file.text();
        const newInvoices = parseCSV(text);
        if (newInvoices.length === 0) {
          alert("No invoices found in CSV. Ensure headers and rows exist.");
          return;
        }
        setInvoices(prev => [...newInvoices, ...prev]);
        trackAction(`Uploaded ${newInvoices.length} invoices via CSV`);
        // attempt batch insert (best-effort)
        try {
          const payload = newInvoices.map(inv => ({
            id: inv.id,
            invoice_number: inv.id,
            carrier: inv.carrier,
            amount: inv.amount,
            status: inv.status,
            date: inv.date,
            created_at: new Date().toISOString()
          }));
          await supabase.from("invoices").insert(payload);
        } catch (err) {
          console.error("Supabase insert failed for uploaded invoices:", err);
        }
      } catch (err) {
        console.error("Reading CSV failed:", err);
        alert("Failed to read CSV. Check file and try again.");
      }
      return;
    }

    // Non-CSV (image/pdf) => upload to storage and call OCR endpoint (placeholder)
    await uploadFileToStorageAndRunOCR(file);
  };

  const uploadFileToStorageAndRunOCR = async (file) => {
    if (!file) return;
    const folder = `uploads/${user?.id ?? "anon"}`;
    const filePath = `${folder}/${Date.now()}_${file.name.replace(/\s/g,"_")}`;
    try {
      // upload to Supabase storage (bucket must exist)
      const { error: uploadErr } = await supabase.storage.from("invoices-files").upload(filePath, file, { upsert: false });
      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        alert("Upload failed (storage). Check bucket/permissions.");
        return;
      }
      trackAction(`Uploaded ${file.name} to storage; starting OCR`);

      // call server-side OCR endpoint (you must implement /api/ocr or Supabase function)
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath })
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("OCR endpoint error:", text);
          alert("OCR failed. Check server logs.");
          return;
        }
        const json = await res.json();
        if (json.parsed) {
          // json.parsed can be an array or single object
          const parsedArr = Array.isArray(json.parsed) ? json.parsed : [json.parsed];
          // normalize parsed items into invoice shape
          const normalized = parsedArr.map(p => ({
            id: p.id || p.invoice_number || `INV-${Math.floor(Math.random()*100000)}`,
            carrier: p.carrier || p.vendor || "Unknown",
            amount: p.total || p.amount || 0,
            status: p.status || "Pending",
            date: p.date || new Date().toISOString().slice(0,10)
          }));
          setInvoices(prev => [...normalized, ...prev]);
          trackAction(`OCR parsed ${normalized.length} invoice(s) from ${file.name}`);
        } else {
          alert("OCR completed but no invoice data found.");
        }
      } catch (err) {
        console.error("OCR call failed:", err);
        alert("OCR endpoint call failed.");
      }
    } catch (err) {
      console.error("uploadFileToStorageAndRunOCR error:", err);
      alert("File upload / OCR initiation failed.");
    }
  };

  const handleUploadInvoices = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ---------- Bulk approve (optimized) ----------
  const handleApprovePayments = async () => {
    const pending = invoices.filter(i => i.status === "Pending");
    if (pending.length === 0) {
      alert("No pending invoices to approve.");
      return;
    }

    // optimistic: mark all pending as Cleared locally
    const pendingIds = new Set(pending.map(p => p.id));
    setInvoices(prev => prev.map(i => pendingIds.has(i.id) ? { ...i, status: "Cleared" } : i));
    trackAction(`Bulk approved ${pending.length} invoices`);

    // persist in one batch (best-effort)
    try {
      await supabase.from("invoices").update({ status: "Cleared", updated_at: new Date().toISOString() }).in("id", pending.map(p => p.id));
      // log user_activity for bulk action
      if (user) {
        await supabase.from("user_activity").insert([{ user_id: user.id, action: `Bulk approved ${pending.length} invoices` }]);
      }
    } catch (err) {
      console.error("Bulk approve persistence failed:", err);
      // no rollback to keep UX simple; optionally refetch from server
    }

    alert(`${pending.length} invoices approved`);
  };

  const handleGenerateReports = () => {
    exportCSV();
    trackAction("Generated invoice report (CSV)");
  };

  // ---------- KPI (useMemo) ----------
  const kpi = useMemo(() => {
    const pending = invoices.filter(i => i.status === "Pending").length;
    const cleared = invoices.filter(i => i.status === "Cleared").length;
    const errors = invoices.filter(i => i.status === "Error").length;
    const timeSavedHrs = cleared * 2 + errors * 0.5;
    return { pending, cleared, errors, timeSavedHrs };
  }, [invoices]);

  // ---------- Filtered view (useMemo) ----------
  const filtered = useMemo(() => {
    const now = new Date();
    const withinDate = (d) => {
      const dt = new Date(d);
      const diff = (now - dt) / (1000 * 60 * 60 * 24);
      if (dateFilter === "last7") return diff <= 7;
      if (dateFilter === "last30") return diff <= 30;
      return true;
    };

    return invoices
      .filter(i =>
        (statusFilter === "all" || i.status === statusFilter) &&
        withinDate(i.date) &&
        (i.id.toLowerCase().includes(search.toLowerCase()) || i.carrier.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, statusFilter, dateFilter, search]);

  // ---------- CSV Export ----------
  const exportCSV = () => {
    const headers = ["Invoice #", "Carrier/Client", "Amount", "Status", "Date"];
    const rows = filtered.map(i => [i.id, i.carrier, i.amount, i.status, i.date]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tallyhauls-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
    trackAction("Exported CSV of filtered invoices");
    alert("CSV Exported!");
  };

  // ---------- Loading UI (must appear AFTER hooks to preserve order) ----------
  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="brand"><img src="/image/1.png" alt="TallyHauls Logo" /></div>
        </header>
        <div style={{ padding: 32, textAlign: "center" }}>
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="dashboard-container">
      {/* Top Bar */}
      <header className="dashboard-header">
        <div className="brand"><img src="/image/1.png" alt="TallyHauls Logo" /></div>
        <nav className="dash-nav">
          <a href="/">Home</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
          <button onClick={handleLogout} className="cta-btn">Logout</button>
        </nav>
      </header>

      {/* Secure login banner */}
      {showSecureMsg && (<div className="secure-banner">✅ You are logged in securely</div>)}

      <h2 className="welcome-msg">Welcome, {user?.email} 👋</h2>

      {/* KPI Bar */}
      <section className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-red" /><span>Pending Invoices</span></div>
          <div className="kpi-value">{kpi.pending}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-green" /><span>Cleared Invoices</span></div>
          <div className="kpi-value">{kpi.cleared}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-amber" /><span>Errors Detected &amp; Fixed</span></div>
          <div className="kpi-value">{kpi.errors}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="dot dot-blue" /><span>Time Saved This Week</span></div>
          <div className="kpi-value">{kpi.timeSavedHrs} hrs</div>
        </div>
      </section>

      {/* Activity + Discrepancies */}
      <section className="two-col">
        <div className="card">
          <div className="card-head"><h3>Recent Activity</h3></div>
          <ul className="activity-list">
            {activity.length > 0 ? activity.map((a, idx) => (
              <li key={idx}><span className="time">{a.time}</span><span className="text">{a.text}</span></li>
            )) : <li>No activity yet.</li>}
          </ul>
        </div>

        <div className="card">
          <div className="card-head"><h3>Error / Discrepancy Summary</h3></div>
          <ul className="error-list">
            {invoices.filter(i => i.status === "Error" || discrepancies.some(d => d.id === i.id)).length > 0 ?
              invoices
                .filter(i => i.status === "Error" || discrepancies.some(d => d.id === i.id))
                .map((i) => {
                  const d = discrepancies.find(d => d.id === i.id) || { type: i.status === "Error" ? "Error Detected" : "Flagged", severity: "medium" };
                  return (
                    <li key={i.id} className={`sev-${d.severity}`}>
                      <div className="err-main">
                        <span className={`badge ${d.severity}`}>{d.type}</span>
                        <span className="muted">on {i.id}</span>
                      </div>
                      <div className="err-actions">
                        <button className="btn-outline" onClick={() => handleApprove(i.id)}>Resolve</button>
                        <button className="btn-text" onClick={() => handleFlag(i.id)}>Flag</button>
                      </div>
                    </li>
                  );
                })
              : <li>No discrepancies.</li>}
          </ul>
        </div>
      </section>

      {/* Table */}
      <section className="card">
        <div className="card-head table-head">
          <h3>Invoice Reconciliation</h3>
          <div className="filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice or carrier…" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared</option>
              <option value="Error">Error</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <button className="btn-primary" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div className="table-wrap" title="Scroll horizontally if needed">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Carrier / Client</th>
                <th className="right">Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((i) => (
                <tr key={i.id}>
                  <td>{i.id}</td>
                  <td>{i.carrier}</td>
                  <td className="right">${i.amount.toLocaleString()}</td>
                  <td>
                    <span className={"status " + (i.status === "Cleared" ? "ok" : i.status === "Pending" ? "pending" : "err")}>
                      {i.status}
                    </span>
                  </td>
                  <td>{i.date}</td>
                  <td className="right">
                    <button className="btn-outline small" onClick={() => handleApprove(i.id)}>Approve</button>
                    <button className="btn-text small" onClick={() => handleFlag(i.id)}>Flag</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="empty">No invoices match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="quick-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/pdf,image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = null;
          }}
        />
        <button className="qa-btn" onClick={handleUploadInvoices}>Upload Invoices</button>
        <button className="qa-btn" onClick={handleApprovePayments}>Approve Payments</button>
        <button className="qa-btn" onClick={handleGenerateReports}>Generate Reports</button>
      </div>

      <footer className="dash-footer">© 2025 TallyHauls. All rights reserved.</footer>
    </div>
  );
}
