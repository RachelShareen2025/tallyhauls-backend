// src/Components/NetCashSummary.jsx
import React from "react";
import "../Pages/Dashboard.css"; // reuse existing styles

export default function NetCashSummary({ kpis }) {
  if (!kpis) return null;

  const {
    projectedCashFlow,
    actualCashFlow,
    totalReceivables,
    totalPayables,
    overdueAmount,
  } = kpis;

  const kpiList = [
    { label: "Projected Net Cash Flow", value: projectedCashFlow, dot: "green" },
    { label: "Actual Net Cash Flow", value: actualCashFlow, dot: "blue" },
    { label: "Total Receivables", value: totalReceivables, dot: "amber" },
    { label: "Total Payables", value: totalPayables, dot: "blue" },
    { label: "Overdue Amount", value: overdueAmount, dot: "red" },
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
}
