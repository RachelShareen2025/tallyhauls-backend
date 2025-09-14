// src/features/cashFlowCalculations.js

/**
 * Utility functions for calculating KPIs and cash flow metrics
 * from parsed invoice rows.
 *
 * Each row is expected to have:
 * - total_charge
 * - carrier_pay
 * - shipper_paid (boolean)
 * - carrier_paid (boolean)
 * - flagged_reason (nullable string)
 */

// ✅ Projected Net Cash Flow = total charges - carrier pay (future-looking)
export function calculateProjectedNetCashFlow(rows) {
  const totalCharges = rows.reduce((sum, r) => sum + (r.total_charge || 0), 0);
  const totalCarrierPay = rows.reduce((sum, r) => sum + (r.carrier_pay || 0), 0);
  return parseFloat((totalCharges - totalCarrierPay).toFixed(2));
}

// ✅ Actual Net Cash Flow = cash actually collected - cash actually paid
export function calculateActualNetCashFlow(rows) {
  const collected = rows
    .filter(r => r.shipper_paid)
    .reduce((sum, r) => sum + (r.total_charge || 0), 0);

  const paid = rows
    .filter(r => r.carrier_paid)
    .reduce((sum, r) => sum + (r.carrier_pay || 0), 0);

  return parseFloat((collected - paid).toFixed(2));
}

// ✅ Total Invoices
export function calculateTotalInvoices(rows) {
  return rows.length;
}

// ✅ Unpaid Shipper Invoices
export function calculateUnpaidShipperInvoices(rows) {
  return rows.filter(r => !r.shipper_paid).length;
}

// ✅ Unpaid Carrier Invoices
export function calculateUnpaidCarrierInvoices(rows) {
  return rows.filter(r => !r.carrier_paid).length;
}

// ✅ Flagged Invoices
export function calculateFlaggedInvoices(rows) {
  return rows.filter(r => r.flagged_reason !== null).length;
}
