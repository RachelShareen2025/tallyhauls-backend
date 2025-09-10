// src/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import "./Dashboard.css";
import { supabase } from "../supabaseClient";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";
import { generateReports } from "../features/generateReports";

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kpiRange, setKpiRange] = useState(30); // 30/60/90 days for KPI projection
  const invoiceInputRef = useRef(null);

  // Fetch invoices from Supabase
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // On mount: check auth + fetch invoices
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

  // Upload invoice handler
  const handleInvoiceUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadInvoiceFile(file);
      await fetchInvoices();
    }
  };

  // Helper: calculate derived fields per invoice
  const calculateDerivedFields = (inv) => {
    const billDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
    const shipperTerms = Number(inv.shipper_terms || 30);
    const carrierTerms = Number(inv.carrier_terms || 15);
    const dueShipper = billDate ? new Date(billDate.getTime() + shipperTerms * 24*60*60*1000) : null;
    const dueCarrier = billDate ? new Date(billDate.getTime() + carrierTerms * 24*60*60*1000) : null;

    // Flagged reason
    const now = new Date();
    let flaggedReason = "—";
    if (dueShipper && !inv.shipper_paid && now > dueShipper) flaggedReason = "Past Due – Shipper";
    else if (dueCarrier && !inv.carrier_paid && now > dueCarrier) flaggedReason = "Past Due – Carrier";

    // Inflow/Outflow
    const inflow = !inv.shipper_paid ? Number(inv.total_charge || 0) : 0;
    const outflow = !inv.carrier_paid ? Number(inv.carrier_pay || 0) : 0;
    const netCash = inflow - outflow;

    // Days until due (for table display)
    const daysUntilShipperDue = dueShipper ? Math.ceil((dueShipper - now)/(1000*60*60*24)) : null;
    const daysUntilCarrierDue = dueCarrier ? Math.ceil((dueCarrier - now)/(1000*60*60*24)) : null;

    return { dueShipper, dueCarrier, flaggedReason, inflow, outflow, netCash, daysUntilShipperDue, daysUntilCarrierDue };
  };

  // Filtered invoices based on search query
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      (inv.load_number && inv.load_number.toLowerCase().includes(q)) ||
      (inv.shipper && inv.shipper.toLowerCase().includes(q)) ||
      (inv.carrier && inv.carrier.toLowerCase().includes(q)) ||
      (inv.invoice_date && new Date(inv.invoice_date).toLocaleDateString().includes(q))
    );
  });

  // KPI Calculations for selected range
  const now = new Date();
  const kpiInvoices = invoices.filter((inv) => {
    const { dueShipper, dueCarrier } = calculateDerivedFields(inv);
    const limitDate = new Date(now.getTime() + kpiRange*24*60*60*1000);
    return (dueShipper && dueShipper <= limitDate) || (dueCarrier && dueCarrier <= limitDate);
  });

  const totalInflow = kpiInvoices.reduce((sum, inv) => sum + (!inv.shipper_paid ? Number(inv.total_charge||0):0), 0);
  const totalOutflow = kpiInvoices.reduce((sum, inv) => sum + (!inv.carrier_paid ? Number(inv.carrier_pay||0):0), 0);
  const netCashFlow = totalInflow - totalOutflow;
  const overdueAmount = kpiInvoices.reduce((sum, inv) => {
    const { flaggedReason } = calculateDerivedFields(inv);
    return flaggedReason.includes("Past Due") ? sum + Number(inv.total_charge||0) : sum;
  }, 0);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <img src="/logo.png" alt="TallyHauls Logo" className="logo" />
        </div>
        <nav className="dashboard-nav">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      {showBanner && <div className="secure-banner">You are securely logged in.</div>}

      {/* KPI Cards + 30/60/90 filter */}
      <div className="kpi-bar">
        <div className="kpi-range-btns">
          <button onClick={()=>setKpiRange(30)} className={kpiRange===30?'active':''}>30 Days</button>
          <button onClick={()=>setKpiRange(60)} className={kpiRange===60?'active':''}>60 Days</button>
          <button onClick={()=>setKpiRange(90)} className={kpiRange===90?'active':''}>90 Days</button>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">Net Cash Flow</div>
          <div className="kpi-value">${netCashFlow.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">Total Receivables</div>
          <div className="kpi-value">${totalInflow.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">Total Payables</div>
          <div className="kpi-value">${totalOutflow.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">Overdue Amount</div>
          <div className="kpi-value">${overdueAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Upload + Reports + Search */}
      <div className="quick-actions horizontal" style={{ marginBottom: "16px" }}>
        <input type="file" ref={invoiceInputRef} style={{ display:"none" }} onChange={handleInvoiceUpload}/>
        <button className="qa-btn" onClick={()=>invoiceInputRef.current && invoiceInputRef.current.click()}>Upload Invoices</button>
        <button className="qa-btn" onClick={generateReports}>Generate Reports</button>
        <input
          type="text"
          placeholder="Search by Load ID, Shipper, Carrier, Date..."
          className="search-bar"
          value={searchQuery}
          onChange={(e)=>setSearchQuery(e.target.value)}
        />
      </div>

      {/* Invoices Table */}
      <div className="card" style={{ margin: "0 24px 24px" }}>
        <div className="card-head table-head"><h3>Invoices</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {/* Load Details */}
                <th>Load ID</th>
                <th>Bill Date</th>
                <th>Total Charge</th>

                {/* Shipper Details */}
                <th>Shipper</th>
                <th>Shipper Terms</th>
                <th>Shipper Paid</th>
                <th>Due Date (Shipper)</th>

                {/* Carrier Details */}
                <th>Carrier</th>
                <th>Carrier Terms</th>
                <th>Carrier Pay</th>
                <th>Carrier Paid</th>
                <th>Due Date (Carrier)</th>

                {/* Results */}
                <th>Flagged Reason</th>
                <th>Inflow</th>
                <th>Outflow</th>
                <th>Net Cash / Load</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="17" style={{ textAlign:"center", padding:"16px"}}>No invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv)=> {
                  const { dueShipper, dueCarrier, flaggedReason, inflow, outflow, netCash } = calculateDerivedFields(inv);
                  return (
                    <tr key={inv.id} className={flaggedReason !== "—" ? "row-flagged" : ""}>
                      {/* Load */}
                      <td>{inv.load_number}</td>
                      <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString():"—"}</td>
                      <td>${Number(inv.total_charge||0).toFixed(2)}</td>

                      {/* Shipper */}
                      <td>{inv.shipper}</td>
                      <td><input type="number" value={inv.shipper_terms||30} onChange={()=>{}}/></td>
                      <td>
                        <input type="checkbox" checked={inv.shipper_paid||false} onChange={()=>{}}/>
                      </td>
                      <td>{dueShipper ? dueShipper.toLocaleDateString():"—"}</td>

                      {/* Carrier */}
                      <td>{inv.carrier}</td>
                      <td><input type="number" value={inv.carrier_terms||15} onChange={()=>{}}/></td>
                      <td><input type="number" value={inv.carrier_pay||0} onChange={()=>{}}/></td>
                      <td>
                        <input type="checkbox" checked={inv.carrier_paid||false} onChange={()=>{}}/>
                      </td>
                      <td>{dueCarrier ? dueCarrier.toLocaleDateString():"—"}</td>

                      {/* Results */}
                      <td>{flaggedReason}</td>
                      <td>${inflow.toFixed(2)}</td>
                      <td>${outflow.toFixed(2)}</td>
                      <td>${netCash.toFixed(2)}</td>
                      <td>
                        {inv.file_url ? <a href={inv.file_url} target="_blank" rel="noreferrer">View</a>:"—"}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="dash-footer">
        © 2025 TallyHauls – All Rights Reserved
      </footer>
    </div>
  );
}
