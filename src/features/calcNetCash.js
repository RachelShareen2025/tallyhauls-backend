// src/features/calcNetCash.js

/**
 * Utility functions for calculating KPIs and cash flow metrics
 * from invoice rows.
 *
 * Each row is expected to have:
 * - total_charge
 * - carrier_pay
 * - shipper_paid (boolean)
 * - carrier_paid (boolean)
 * - flagged_reason (nullable string)
 */

// Projected Net Cash Flow = total charges - carrier pay (future-looking)
export function calculateProjectedNetCashFlow(rows) {
  const totalCharges = rows.reduce((sum, r) => sum + (r.total_charge || 0), 0);
  const totalCarrierPay = rows.reduce((sum, r) => sum + (r.carrier_pay || 0), 0);
  return parseFloat((totalCharges - totalCarrierPay).toFixed(2));
}

// Actual Net Cash Flow = cash actually collected - cash actually paid
export function calculateActualNetCashFlow(rows) {
  const collected = rows
    .filter(r => r.shipper_paid)
    .reduce((sum, r) => sum + (r.total_charge || 0), 0);

  const paid = rows
    .filter(r => r.carrier_paid)
    .reduce((sum, r) => sum + (r.carrier_pay || 0), 0);

  return parseFloat((collected - paid).toFixed(2));
}

// Total Invoices
export function calculateTotalInvoices(rows) {
  return rows.length;
}

// Unpaid Shipper Invoices
export function calculateUnpaidShipperInvoices(rows) {
  return rows.filter(r => !r.shipper_paid).length;
}

// Unpaid Carrier Invoices
export function calculateUnpaidCarrierInvoices(rows) {
  return rows.filter(r => !r.carrier_paid).length;
}

// Flagged Invoices
export function calculateFlaggedInvoices(rows) {
  return rows.filter(r => r.flagged_reason !== null).length;
}

// Total Receivables = sum of unpaid shipper invoices
export function calculateTotalReceivables(rows) {
  return rows
    .filter(r => !r.shipper_paid)
    .reduce((sum, r) => sum + (r.total_charge || 0), 0);
}

// Total Payables = sum of unpaid carrier invoices
export function calculateTotalPayables(rows) {
  return rows
    .filter(r => !r.carrier_paid)
    .reduce((sum, r) => sum + (r.carrier_pay || 0), 0);
}

// Overdue Amount = sum of net cash (total_charge - carrier_pay) for flagged invoices
export function calculateOverdueAmount(rows) {
  return rows
    .filter(r => r.flagged_reason)
    .reduce((sum, r) => sum + ((r.total_charge || 0) - (r.carrier_pay || 0)), 0);
}

// Wrapper for Dashboard / NetCashSummary.jsx
export function computeKPIs(rows) {
  const projectedCashFlow = calculateProjectedNetCashFlow(rows);
  const actualCashFlow = calculateActualNetCashFlow(rows);
  const totalReceivables = calculateTotalReceivables(rows);
  const totalPayables = calculateTotalPayables(rows);
  const overdueAmount = calculateOverdueAmount(rows);

  return { projectedCashFlow, actualCashFlow, totalReceivables, totalPayables, overdueAmount };
}
