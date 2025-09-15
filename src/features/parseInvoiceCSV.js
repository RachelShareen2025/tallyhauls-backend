// src/features/parseInvoiceCSV.js
import Papa from "papaparse";

const normalizeHeader = (header) => header?.trim().toLowerCase();

const csvMap = {
  load_number: ["load id", "load #", "loadnumber", "loadnum", "loadno"],
  total_charge: ["total charge", "rate", "load rate", "amount", "rate$", "charge"],
  bill_date: ["bill date", "invoice date", "date"],
  shipper: ["shipper", "customer", "client", "shipper name"],
  carrier: ["carrier", "trucking company", "transporter", "carrier name"],
  carrier_pay: ["carrier pay", "carrier amount", "carrier rate", "carrier$", "carrier_charge"]
};

const getCsvValue = (row, aliases) => {
  for (let a of aliases) {
    if (row[a] !== undefined && row[a] !== "") return row[a];
  }
  return null;
};

export function parseInvoiceCSV(fileText) {
  const parsed = Papa.parse(fileText, { header: true, skipEmptyLines: true });
  let rows = parsed.data;

  if (!rows || rows.length === 0) {
    throw new Error("CSV is empty or invalid.");
  }

  rows = rows.map((row) => {
    const normalizedRow = {};
    for (let key in row) normalizedRow[normalizeHeader(key)] = row[key];
    return normalizedRow;
  });

  const invoiceRows = rows.map((row, i) => {
    const loadNumber = getCsvValue(row, csvMap.load_number)?.trim();
    if (!loadNumber) throw new Error(`Missing load_number in CSV at row ${i + 1}`);

    const totalCharge = parseFloat(getCsvValue(row, csvMap.total_charge)) || 0;
    const carrierPay = parseFloat(getCsvValue(row, csvMap.carrier_pay)) || 0;

    // ✅ Always store bill_date as YYYY-MM-DD
    const billDateRaw = getCsvValue(row, csvMap.bill_date);
    const billDate = billDateRaw ? new Date(billDateRaw) : null;
    const billDateFormatted = billDate ? billDate.toISOString().split("T")[0] : null;

    const today = new Date();
    const shipperTermsDays = 30;
    const carrierTermsDays = 15;

    const shipperDue = billDate ? new Date(billDate.getTime() + shipperTermsDays * 86400000) : null;
    const carrierDue = billDate ? new Date(billDate.getTime() + carrierTermsDays * 86400000) : null;

    let flaggedReason = null;
    if (shipperDue && shipperDue < today) flaggedReason = "Past Due – Shipper";
    else if (carrierDue && carrierDue < today) flaggedReason = "Past Due – Carrier";

    return {
      load_number: loadNumber,
      bill_date: billDateFormatted,
      shipper: getCsvValue(row, csvMap.shipper)?.trim(),
      total_charge: parseFloat(totalCharge.toFixed(2)),
      shipper_terms: "Net 30",
      shipper_paid: false,
      carrier: getCsvValue(row, csvMap.carrier)?.trim(),
      carrier_pay: parseFloat(carrierPay.toFixed(2)),
      carrier_terms: "Net 15",
      carrier_paid: false,
      flagged_reason: flaggedReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_url: row.file_url || null
    };
  });

  return invoiceRows;
}
