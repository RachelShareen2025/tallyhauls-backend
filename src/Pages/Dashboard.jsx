import React, { useMemo, useState, useEffect } from "react";
import "./Dashboard.css";
import { supabase } from "./supabaseClient";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("last7");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecureMsg, setShowSecureMsg] = useState(false);

  // ---------------- Auth Check ----------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user);
        setShowSecureMsg(true);
        setTimeout(() => setShowSecureMsg(false), 3000); // auto-hide after 3s
      } else {
        window.location.href = "/";
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session) {
          setShowSecureMsg(true);
          setTimeout(() => setShowSecureMsg(false), 3000);
        } else {
          window.location.href = "/";
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;

  // ---------------- Logout ----------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  // ---------------- Mock Data ----------------
  const invoices = [
    { id: "INV-10124", carrier: "Swift Logistics", amount: 1250.0, status: "Pending", date: "2025-08-20" },
    { id: "INV-10125", carrier: "RoadRunner",     amount: 980.5,  status: "Cleared", date: "2025-08-18" },
    { id: "INV-10126", carrier: "Atlas Carriers",  amount: 1600.0, status: "Error",   date: "2025-08-22" },
    { id: "INV-10127", carrier: "BlueLine",        amount: 715.0,  status: "Pending", date: "2025-08-21" },
    { id: "INV-10128", carrier: "Nexus Freight",   amount: 2100.0, status: "Cleared", date: "2025-08-19" },
    { id: "INV-10129", carrier: "ExpressHaul",     amount: 1430.0, status: "Error",   date: "2025-08-16" },
    { id: "INV-10130", carrier: "Prime Movers",    amount: 890.0,  status: "Cleared", date: "2025-08-23" },
  ];

  const activity = [
    { time: "2h ago", text: "Invoice INV-10130 reconciled and cleared." },
    { time: "4h ago", text: "Rate mismatch flagged on INV-10126." },
    { time: "Yesterday", text: "3 invoices auto-matched to loads." },
    { time: "2 days ago", text: "Payment confirmation received from BlueLine." },
  ];

  const discrepancies = [
    { id: "INV-10126", type: "Rate mismatch",      severity: "high" },
    { id: "INV-10129", type: "Missing POD",        severity: "medium" },
    { id: "INV-10107", type: "Duplicate invoice",  severity: "low" },
  ];

  // ---------------- KPI Metrics ----------------
  const kpi = useMemo(() => {
    const pending = invoices.filter(i => i.status === "Pending").length;
    const cleared = invoices.filter(i => i.status === "Cleared").length;
    const errors  = invoices.filter(i => i.status === "Error").length;
    const timeSavedHrs = cleared * 2 + errors * 0.5;
    return { pending, cleared, errors, timeSavedHrs };
  }, [invoices]);

  // ---------------- Filters ----------------
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
        (i.id.toLowerCase().includes(search.toLowerCase()) ||
         i.carrier.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, statusFilter, dateFilter, search]);

  // ---------------- CSV Export ----------------
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
  };

  return (
    <div className="dashboard-container">
      {/* Top Bar */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/image/1.png" alt="TallyHauls Logo" />
        </div>
        <nav className="dash-nav">
          <a href="/">Home</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
          <button onClick={handleLogout} className="cta-btn">Logout</button>
        </nav>
      </header>

      {/* Secure login banner */}
      {showSecureMsg && (
        <div className="secure-msg">
          ✅ You are logged in securely
        </div>
      )}

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
            {activity.map((a, idx) => (
              <li key={idx}><span className="time">{a.time}</span><span className="text">{a.text}</span></li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-head"><h3>Error / Discrepancy Summary</h3></div>
          <ul className="error-list">
            {discrepancies.map((d) => (
              <li key={d.id} className={`sev-${d.severity}`}>
                <div className="err-main">
                  <span className={`badge ${d.severity}`}>{d.type}</span>
                  <span className="muted">on {d.id}</span>
                </div>
                <div className="err-actions">
                  <button className="btn-outline">Resolve</button>
                  <button className="btn-text">Flag</button>
                </div>
              </li>
            ))}
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

        <div className="table-wrap">
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
              {filtered.map((i) => (
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
                    <button className="btn-outline small">Approve</button>
                    <button className="btn-text small">Flag</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
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
        <button className="qa-btn">Upload Invoices</button>
        <button className="qa-btn">Approve Payments</button>
        <button className="qa-btn">Generate Reports</button>
      </div>

      <footer className="dash-footer">© 2025 TallyHauls. All rights reserved.</footer>
    </div>
  );
}
