export function getFlaggedReason(row, allInvoices = []) {
  const issues = [];

  // Required fields
  if (!row.load_number || !row.load_number.toString().trim()) issues.push("Missing Load #");
  if (!row.bill_date || isNaN(new Date(row.bill_date))) issues.push("Invalid/Missing Bill Date");
  if (!row.shipper || !row.shipper.trim()) issues.push("Missing Shipper");
  if (!row.carrier || !row.carrier.trim()) issues.push("Missing Carrier");

  // Numeric validation
  const totalCharge = parseFloat(row.total_charge);
  const carrierPay = parseFloat(row.carrier_pay);

  if (isNaN(totalCharge) || totalCharge <= 0) issues.push("Invalid Total Charge");
  if (isNaN(carrierPay) || carrierPay <= 0) issues.push("Invalid Carrier Pay");
  if (!isNaN(totalCharge) && !isNaN(carrierPay) && carrierPay > totalCharge)
    issues.push("Carrier Pay Exceeds Load Rate");

  // Overdue checks
  const today = new Date();
  const shipperDue = row.shipper_due ? new Date(row.shipper_due) : null;
  const carrierDue = row.carrier_due ? new Date(row.carrier_due) : null;

  if (!row.shipper_paid && shipperDue && !isNaN(shipperDue) && shipperDue < today)
    issues.push("Shipper Overdue");
  if (!row.carrier_paid && carrierDue && !isNaN(carrierDue) && carrierDue < today)
    issues.push("Carrier Overdue");

  // ✅ New checks
  const billDateObj = row.bill_date ? new Date(row.bill_date) : null;
  if (billDateObj && billDateObj > today) issues.push("Bill Date in the Future");

  if (!isNaN(totalCharge) && !isNaN(carrierPay) && (totalCharge - carrierPay) <= 0)
    issues.push("Net Cash <= 0");

  // Duplicate detection per broker
  if (allInvoices.length > 0 && row.broker_email) {
    const duplicateCount = allInvoices.filter(
      inv => inv.load_number === row.load_number && inv.broker_email === row.broker_email
    ).length;
    if (duplicateCount > 1) issues.push("Duplicate Load #");
  }

  return issues.length ? issues.join("; ") : null;
}
