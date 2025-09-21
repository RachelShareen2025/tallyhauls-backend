// src/features/flaggedReasons.js
// Centralized flagged-reason logic (re-used by Backend + Frontend)

export function getFlaggedReason(row) {
  // Basic required fields
  if (!row.load_number) return "Missing Load #";
  if (!row.bill_date) return "Missing Bill Date";
  if (!row.shipper) return "Missing Shipper";
  if (!row.carrier) return "Missing Carrier";

  const totalCharge = Number(row.total_charge || 0);
  const carrierPay = Number(row.carrier_pay || 0);

  // Numeric validations
  if (totalCharge <= 0) return "Invalid Total Charge";
  if (carrierPay < 0) return "Invalid Carrier Pay";
  if (carrierPay > totalCharge) return "Carrier Pay Exceeds Load Rate";

  // Overdue logic
  const today = new Date();
  const shipperDueDate = row.shipper_due ? new Date(row.shipper_due) : null;
  const carrierDueDate = row.carrier_due ? new Date(row.carrier_due) : null;

  const shipperOverdue = !row.shipper_paid && shipperDueDate && !isNaN(shipperDueDate) && shipperDueDate < today;
  const carrierOverdue = !row.carrier_paid && carrierDueDate && !isNaN(carrierDueDate) && carrierDueDate < today;

  if (shipperOverdue && carrierOverdue) return "Overdue";
  if (shipperOverdue) return "Shipper Overdue";
  if (carrierOverdue) return "Carrier Overdue";

  return "";
}
