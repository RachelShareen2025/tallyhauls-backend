// src/features/parser.js
import Papa from "papaparse";
import { getFlaggedReason } from "./flaggedReasons";

/* -----------------------------
   Column Normalization & CSV Mapping
----------------------------- */
const normalizeHeader = header => header?.trim().toLowerCase();

const csvMap = {
  load_number: ["load id", "load #", "loadnumber", "loadnum", "loadno"],
  total_charge: ["total charge", "rate", "load rate", "amount", "rate$", "charge"],
  bill_date: ["bill date", "invoice date", "date"],
  shipper: ["shipper", "customer", "client", "shipper name"],
  carrier: ["carrier", "trucking company", "transporter", "carrier name"],
  carrier_pay: ["carrier pay", "carrier amount", "carrier rate", "carrier$", "carrier_charge"]
};

const getCsvValue = (row, aliases) => {
  for (let a of aliases) if (row[a] !== undefined && row[a] !== "") return row[a];
  return null;
};

/* -----------------------------
   Parse Invoice CSV
----------------------------- */
export function parseInvoiceCSV(fileText) {
  const parsed = Papa.parse(fileText, { header: true, skipEmptyLines: true });
  let rows = parsed.data;
  if (!rows || rows.length === 0) throw new Error("CSV is empty or invalid.");

  // Normalize headers
  rows = rows.map(row => {
    const normalizedRow = {};
    for (let key in row) normalizedRow[normalizeHeader(key)] = row[key];
    return normalizedRow;
  });

  return rows.map(row => {
    const loadNumber = getCsvValue(row, csvMap.load_number)?.trim();
    if (!loadNumber) return { flagged_reason: "Missing load_number", ...row };

    const parseNumber = val => {
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    };

    const totalCharge = parseNumber(getCsvValue(row, csvMap.total_charge));
    const carrierPay = parseNumber(getCsvValue(row, csvMap.carrier_pay));

    let billDateRaw = getCsvValue(row, csvMap.bill_date);
    let billDateObj = billDateRaw ? new Date(billDateRaw) : null;
    let billDateFormatted = billDateObj && !isNaN(billDateObj) ? billDateObj.toISOString().split("T")[0] : null;

    return {
      load_number: loadNumber,
      bill_date: billDateFormatted,
      shipper: getCsvValue(row, csvMap.shipper)?.trim(),
      total_charge: parseFloat(totalCharge.toFixed(2)),
      shipper_terms: "Net 30",
      shipper_due: billDateObj ? new Date(billDateObj.getTime() + 30 * 86400000).toISOString().split("T")[0] : null,
      shipper_paid: false,
      carrier: getCsvValue(row, csvMap.carrier)?.trim(),
      carrier_pay: parseFloat(carrierPay.toFixed(2)),
      carrier_terms: "Net 15",
      carrier_due: billDateObj ? new Date(billDateObj.getTime() + 15 * 86400000).toISOString().split("T")[0] : null,
      carrier_paid: false,
      broker_email: row.broker_email || null, // <-- added broker email
      flagged_reason: getFlaggedReason({
        load_number: loadNumber,
        bill_date: billDateFormatted,
        shipper: getCsvValue(row, csvMap.shipper)?.trim(),
        carrier: getCsvValue(row, csvMap.carrier)?.trim(),
        total_charge: parseFloat(totalCharge.toFixed(2)),
        carrier_pay: parseFloat(carrierPay.toFixed(2)),
        shipper_paid: false,
        carrier_paid: false,
        shipper_due: billDateObj ? new Date(billDateObj.getTime() + 30 * 86400000).toISOString().split("T")[0] : null,
        carrier_due: billDateObj ? new Date(billDateObj.getTime() + 15 * 86400000).toISOString().split("T")[0] : null,
        broker_email: row.broker_email || null
      }, []), // keep empty array because duplicates are handled in frontend/backend
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_url: row.file_url || null,
    };
  });
}
