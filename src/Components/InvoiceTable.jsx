// src/Components/InvoiceTable.jsx
import React from "react";
import "../Pages/Dashboard.css"; // reuse styles

export default function InvoiceTable({ invoices, searchQuery }) {
  if (!invoices) return null;

  // Filter invoices based on searchQuery (case-insensitive)
  const filteredInvoices = invoices.filter((inv) =>
    JSON.stringify(inv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper: safely format due date
  const formatDueDate = (billDate, days) => {
    if (!billDate) return "—";
    const date = new Date(billDate);
    if (isNaN(date.getTime())) return "—"; // invalid date fallback
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString();
  };

  return (
    <div className="card" style={{ margin: "0 24px 24px" }}>
      <div className="card-head table-head">
        <h3>Invoices</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Load #</th>
              <th>Bill Date</th>
              <th>Shipper</th>
              <th className="numeric">Load Rate ($)</th>
              <th>Terms & Due Dates</th>
              <th>Shipper Paid</th>
              <th>Carrier</th>
              <th className="numeric">Carrier Pay ($)</th>
              <th>Carrier Paid</th>
              <th className="numeric">Net Cash</th>
              <th>Flagged Reason</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan="12" style={{ textAlign: "center", padding: "16px" }}>
                  No invoices uploaded yet.
                </td>
              </tr>
            )}

            {filteredInvoices.map((inv) => {
              const netCash = Number(inv.total_charge || 0) - Number(inv.carrier_pay || 0);
              const billDate = inv.bill_date ? new Date(inv.bill_date) : null;

              // Combined Terms + Due Dates
              const termsWithDue = `${
                inv.shipper_terms || "Net 30"
              } - ${formatDueDate(billDate, 30)}, ${
                inv.carrier_terms || "Net 15"
              } - ${formatDueDate(billDate, 15)}`;

              return (
                <tr key={inv.id} className={inv.flagged_reason ? "row-flagged" : ""}>
                  <td>{inv.load_number || "—"}</td>
                  <td>{billDate && !isNaN(billDate.getTime()) ? billDate.toLocaleDateString() : "—"}</td>
                  <td>{inv.shipper}</td>
                  <td className="numeric">{Number(inv.total_charge || 0).toFixed(2)}</td>
                  <td>{termsWithDue}</td>
                  <td>
                    <input type="checkbox" checked={inv.shipper_paid || false} readOnly />
                  </td>
                  <td>{inv.carrier}</td>
                  <td className="numeric">{Number(inv.carrier_pay || 0).toFixed(2)}</td>
                  <td>
                    <input type="checkbox" checked={inv.carrier_paid || false} readOnly />
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
}
