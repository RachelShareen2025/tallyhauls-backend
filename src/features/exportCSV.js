// src/features/exportCSV.js
import { computeKPIs } from "./Backend";
import { getFlaggedReason } from "./flaggedReasons";

/**
 * Download CSV for invoices and KPIs
 * @param {Array} invoices - full invoice array
 * @param {string} filename - desired CSV filename
 */
export function downloadCSV(invoices, filename = "TallyHauls_Report.csv") {
  if (!invoices || invoices.length === 0) return alert("No invoices to download.");

  // Sort invoices by oldest bill_date first
  const sortedInvoices = [...invoices].sort((a, b) => {
    const aDate = a.bill_date ? new Date(a.bill_date) : new Date(0);
    const bDate = b.bill_date ? new Date(b.bill_date) : new Date(0);
    return aDate - bDate;
  });

  const escapeCSV = (text) => `"${String(text || "").replace(/"/g, '""')}"`;

  const headers = [
    "Load #",
    "Bill Date",
    "Shipper",
    "Load Rate ($)",
    "Shipper Terms & Due",
    "Shipper Paid",
    "Carrier",
    "Carrier Pay ($)",
    "Carrier Terms & Due",
    "Carrier Paid",
    "Net Cash",
    "Flagged Reason",
    "File",
  ];

  const lines = [headers.join(",")];

  // Build invoice rows
  sortedInvoices.forEach((inv) => {
    const netCash = (inv.total_charge ?? 0) - (inv.carrier_pay ?? 0);
    const flaggedReason = getFlaggedReason(inv, sortedInvoices) || "";

    const shipperDueStr = inv.shipper_due
      ? inv.shipper_due.toISOString().split("T")[0]
      : "";
    const carrierDueStr = inv.carrier_due
      ? inv.carrier_due.toISOString().split("T")[0]
      : "";

    lines.push(
      [
        escapeCSV(inv.load_number),
        escapeCSV(inv.bill_date ? inv.bill_date.toISOString().split("T")[0] : ""),
        escapeCSV(inv.shipper),
        (inv.total_charge ?? 0).toFixed(2),
        escapeCSV(`Net 30 - ${shipperDueStr}`),
        inv.shipper_paid ? "Yes" : "No",
        escapeCSV(inv.carrier),
        (inv.carrier_pay ?? 0).toFixed(2),
        escapeCSV(`Net 15 - ${carrierDueStr}`),
        inv.carrier_paid ? "Yes" : "No",
        netCash.toFixed(2),
        escapeCSV(flaggedReason),
        escapeCSV(inv.file_url),
      ].join(",")
    );
  });

  // Add KPI rows
  const kpis = computeKPIs(invoices);
  const kpiRows = [
    ["", "", "KPIs"],
    ["Projected Net Cash Flow", kpis.projectedCashFlow.toFixed(2)],
    ["Actual Net Cash Flow", kpis.actualCashFlow.toFixed(2)],
    ["Total Receivables", kpis.totalReceivables.toFixed(2)],
    ["Total Payables", kpis.totalPayables.toFixed(2)],
    ["Overdue Shipper Amount", kpis.overdueShipperAmount.toFixed(2)],
    ["Overdue Carrier Amount", kpis.overdueCarrierAmount.toFixed(2)],
  ];
  kpiRows.forEach((r) => lines.push(r.join(",")));

  const blob = new Blob(lines, { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
