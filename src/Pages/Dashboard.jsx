import React, { useMemo, useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  // ---------- State & Refs ----------
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

  // ---------- Auth Check ----------
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

  // ---------- Initial Data Load ----------
  useEffect(() => {
    (async () => {
      try {
        // Invoices
        const { data: invs, error: invErr } = await supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        if (!invErr && invs?.length) {
          setInvoices(invs.map(row => ({
            id: row.id ?? row.invoice_number ?? `INV-${Math.floor(Math.random()*100000)}`,
            carrier: row.carrier ?? row.client ?? "Unknown",
            amount: typeof row.amount === "number" ? row.amount : parseFloat(row.amount) || 0,
            status: row.status ?? "Pending",
            date: row.date ? String(row.date).split("T")[0] : (row.created_at ? String(row.created_at).split("T")[0] : new Date().toISOString().slice(0,10))
          })));
        } else {
          // fallback mock
          setInvoices([
            { id: "INV-10124", carrier: "Swift Logistics", amount: 1250.0, status: "Pending", date: "2025-08-20" },
            { id: "INV-10125", carrier: "RoadRunner", amount: 980.5, status: "Cleared", date: "2025-08-18" },
            { id: "INV-10126", carrier: "Atlas Carriers", amount: 1600.0, status: "Error", date: "2025-08-22" },
            { id: "INV-10127", carrier: "BlueLine", amount: 715.0, status: "Pending", date: "2025-08-21" },
            { id: "INV-10128", carrier: "Nexus Freight", amount: 2100.0, status: "Cleared", date: "2025-08-19" },
            { id: "INV-10129", carrier: "ExpressHaul", amount: 1430.0, status: "Error", date: "2025-08-16" },
            { id: "INV-10130", carrier: "Prime Movers", amount: 890.0, status: "Cleared", date: "2025-08-23" },
          ]);
        }

        // Activity
        const { data: acts } = await supabase
          .from("user_activity")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(50);

        if (acts?.length) {
          setActivity(acts.map(a => ({ time: new Date(a.timestamp).toLocaleString(), text: a.action })));
        } else {
          setActivity([
            { time: "2h ago", text: "Invoice INV-10130 reconciled and cleared." },
            { time: "4h ago", text: "Rate mismatch flagged on INV-10126." },
            { time: "Yesterday", text: "3 invoices auto-matched to loads." },
            { time: "2 days ago", text: "Payment confirmation received from BlueLine." },
          ]);
        }

        // Discrepancies
        const { data: dis } = await supabase
          .from("discrepancies")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (dis?.length) {
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
      }
    })();
  }, []);

  // ---------- Utility: Track Actions ----------
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
    try { await supabase.auth.signOut(); } catch (e) {}
    setUser(null);
    window.location.href = "/";
  };

  // ---------- Approve & Flag ----------
  const handleApprove = async (invoiceId) => {
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'Cleared' } : i));
    setDiscrepancies(prev => prev.filter(d => d.id !== invoiceId));
    trackAction(`Approved invoice ${invoiceId}`);

    try {
      await supabase.from("invoices").update({ status: "Cleared", updated_at: new Date().toISOString() }).eq("id", invoiceId);
      if (user) await supabase.from("user_activity").insert([{ user_id: user.id, action: `Approved invoice ${invoiceId}` }]);
    } catch (err) {
      console.error("Failed to persist approve:", err);
    }
  };

  const handleFlag = async (invoiceId) => {
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

  // ---------- CSV / File Upload ----------
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

    if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
      try {
        const text = await file.text();
        const newInvoices = parseCSV(text);
        if (!newInvoices.length) {
          alert("No invoices found in CSV.");
          return;
        }
        setInvoices(prev => [...newInvoices, ...prev]);
        trackAction(`Uploaded ${newInvoices.length} invoices via CSV`);
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
        alert("Failed to read CSV.");
      }
      return;
    }

    await uploadFileToStorageAndRunOCR(file);
  };

  const uploadFileToStorageAndRunOCR = async (file) => {
    if (!file) return;
    const folder = `uploads/${user?.id ?? "anon"}`;
    const filePath = `${folder}/${Date.now()}_${file.name.replace(/\s/g,"_")}`;

    try {
      const { error: uploadErr } = await supabase.storage.from("invoices-files").upload(filePath, file, { upsert: false });
      if (uploadErr) { console.error(uploadErr); alert("Upload failed"); return; }
      trackAction(`Uploaded ${file.name} to storage; starting OCR`);

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath })
      });
      if (!res.ok) { console.error(await res.text()); alert("OCR failed"); return; }

      const json = await res.json();
      if (json.parsed) {
        const normalized = (Array.isArray(json.parsed) ? json.parsed : [json.parsed]).map(p => ({
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
      console.error(err);
      alert("File upload / OCR failed.");
    }
  };

  const handleUploadInvoices = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  // ---------- Bulk Approve ----------
  const handleApprovePayments = async () => {
    const pending = invoices.filter(i => i.status === "Pending");
    if (!pending.length) { alert("No pending invoices"); return; }
    const pendingIds = new Set(pending.map(p => p.id));
    setInvoices(prev => prev.map(i => pendingIds.has(i.id) ? { ...i, status: "Cleared" } : i));
    trackAction(`Bulk approved ${pending.length} invoices`);

    try {
      await supabase.from("invoices").update({ status: "Cleared", updated_at: new Date().toISOString() }).in("id", pending.map(p => p.id));
      if (user) await supabase.from("user_activity").insert([{ user_id: user.id, action: `Bulk approved ${pending.length} invoices` }]);
    } catch (err) { console.error("Bulk approve failed", err); }

    alert(`${pending.length} invoices approved`);
  };

  const handleGenerateReports = () => { exportCSV(); trackAction("Generated invoice report (CSV)"); };

  // ---------- KPI ----------
  const kpi = useMemo(() => {
    const pending = invoices.filter(i => i.status === "Pending").length;
    const cleared = invoices.filter(i => i.status === "Cleared").length;
    const errors = invoices.filter(i => i.status === "Error").length;
    const timeSavedHrs = cleared * 2 + errors * 0.5;
    return { pending, cleared, errors, timeSavedHrs };
  }, [invoices]);

  // ---------- Filtered View ----------
  const filtered = useMemo(() => {
    const now = new Date();
    const withinDate = (d) => {
      const dt = new Date(d);
      const diff = (now - dt) / (1000*60*60*24);
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
      .sort((a,b) => new Date(b.date)-new Date(a.date));
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

  // ---------- Loading ----------
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
      {showSecureMsg && <div className="secure-banner">✅ You are logged in securely</div>}

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
          <div className="kpi-top"><span className="dot dot-amber" /><span>Errors Detected & Fixed</span></div>
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
            {activity.length ? activity.map((a,idx) => <li key={idx}><span className="time">{a.time}</span><span className="text">{a.text}</span></li>) : <li>No activity yet</li>}
          </ul>
        </div>
        <div className="card">
          <div className="card-head"><h3>Discrepancies</h3></div>
          <ul className="activity-list">
            {discrepancies.length ? discrepancies.map(d => <li key={d.id}><strong>{d.id}</strong>: {d.type} <em>({d.severity})</em></li>) : <li>No discrepancies</li>}
          </ul>
        </div>
      </section>

      {/* Filters + Bulk Actions */}
      <section className="filters-actions">
        <input placeholder="Search by invoice or carrier" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Cleared">Cleared</option>
          <option value="Error">Error</option>
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="all">All Dates</option>
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
        </select>
        <button onClick={handleApprovePayments}>Bulk Approve</button>
        <button onClick={handleGenerateReports}>Export CSV</button>
        <button onClick={handleUploadInvoices}>Upload Invoice</button>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={e => handleFileUpload(e.target.files[0])} />
      </section>

      {/* Invoice Table */}
      <section className="invoice-table-section">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Carrier/Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map(i => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.carrier}</td>
                <td>${i.amount.toFixed(2)}</td>
                <td>{i.status}</td>
                <td>{i.date}</td>
                <td>
                  {i.status !== "Cleared" && <button onClick={() => handleApprove(i.id)}>Approve</button>}
                  <button onClick={() => handleFlag(i.id)}>Flag</button>
                </td>
              </tr>
            )) : <tr><td colSpan={6} style={{ textAlign: "center" }}>No invoices found</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
