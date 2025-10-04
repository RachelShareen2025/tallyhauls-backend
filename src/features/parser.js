// src/features/parser.js
import Papa from "papaparse";
import { getFlaggedReason } from "./flaggedReasons";
import { DateTime } from "luxon";

/* -----------------------------
   1️⃣ Helper: Normalize any header or alias
----------------------------- */
const normalizeKey = key =>
  key?.trim().toLowerCase().replace(/[\s_]+/g, "");

/* -----------------------------
   2️⃣ Alias Map (normalized at startup)
----------------------------- */
const rawCsvMap = {
  load_number: ["load id", "load #", "loadnumber", "loadnum", "loadno"],
  total_charge: ["total charge", "rate", "load rate", "amount", "rate$", "charge"],
  bill_date: ["bill date", "invoice date", "date"],
  shipper: ["shipper", "customer", "client", "shipper name"],
  carrier: ["carrier", "trucking company", "transporter", "carrier name"],
  carrier_pay: ["carrier pay", "carrier amount", "carrier rate", "carrier$", "carrier_charge"]
};

// Pre-normalize aliases
const csvMap = {};
for (let field in rawCsvMap) {
  csvMap[field] = rawCsvMap[field].map(alias => normalizeKey(alias));
}

/* -----------------------------
   3️⃣ Helper: Get CSV value by alias list
----------------------------- */
const getCsvValue = (row, aliases) => {
  for (let a of aliases) {
    for (let key in row) {
      if (normalizeKey(key) === a && row[key] !== "") return row[key];
    }
  }
  return null;
};

/* -----------------------------
   4️⃣ Helper: Robust U.S. Number Parser
----------------------------- */
const parseNumber = val => {
  if (!val) return 0;

  let str = String(val).trim();

  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }

  str = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
};

/* -----------------------------
   5️⃣ Helper: Flexible Date Parser
----------------------------- */
const parseDate = input => {
  if (!input) return null;
  input = input.trim();

  const dt = DateTime.fromISO(input, { zone: 'utc' });
  if (dt.isValid) return dt;

  const textual = Date.parse(input);
  if (!isNaN(textual)) return DateTime.fromJSDate(new Date(textual), { zone: 'utc' });

  return null;
};

/* -----------------------------
   6️⃣ Map CSV rows to DB-ready objects
----------------------------- */
export function mapRowsForDB(rows, loggedInBrokerEmail, brokerTimezone = "America/New_York") {
  if (!rows || rows.length === 0) throw new Error("CSV is empty or invalid.");

  return rows.map(row => {
    const loadNumber = getCsvValue(row, csvMap.load_number)?.trim();
    const totalCharge = parseNumber(getCsvValue(row, csvMap.total_charge));
    const carrierPay = parseNumber(getCsvValue(row, csvMap.carrier_pay));
    const billDateRaw = getCsvValue(row, csvMap.bill_date);
    const billDateObj = parseDate(billDateRaw);

    // Convert bill date to UTC using broker's timezone
    const billDateUTC = billDateObj
      ? DateTime.fromJSDate(billDateObj, { zone: brokerTimezone }).toUTC()
      : null;

    const shipperDueUTC = billDateUTC ? billDateUTC.plus({ days: 30 }) : null;
    const carrierDueUTC = billDateUTC ? billDateUTC.plus({ days: 15 }) : null;

    const shipperVal = getCsvValue(row, csvMap.shipper)?.trim();
    const carrierVal = getCsvValue(row, csvMap.carrier)?.trim();

    const flaggedReason = getFlaggedReason(
      {
        load_number: loadNumber,
        bill_date: billDateUTC?.toISODate(),
        shipper: shipperVal,
        carrier: carrierVal,
        total_charge: parseFloat(totalCharge.toFixed(2)),
        carrier_pay: parseFloat(carrierPay.toFixed(2)),
        shipper_paid: false,
        carrier_paid: false,
        shipper_due: shipperDueUTC?.toISODate(),
        carrier_due: carrierDueUTC?.toISODate(),
        broker_email: loggedInBrokerEmail
      },
      rows
    );

    return {
      load_number: loadNumber,
      bill_date: billDateUTC?.toISODate() || null,
      shipper: shipperVal,
      total_charge: parseFloat(totalCharge.toFixed(2)),
      shipper_terms: "Net 30",
      shipper_due: shipperDueUTC?.toISODate() || null,
      shipper_paid: false,
      carrier: carrierVal,
      carrier_pay: parseFloat(carrierPay.toFixed(2)),
      carrier_terms: "Net 15",
      carrier_due: carrierDueUTC?.toISODate() || null,
      carrier_paid: false,
      broker_email: loggedInBrokerEmail,
      flagged_reason: flaggedReason,
      status: "pending",
      created_at: DateTime.utc().toISO(),
      updated_at: DateTime.utc().toISO(),
      file_url: row.file_url || null
    };
  });
}

/* -----------------------------
   7️⃣ Parse CSV and map for DB
----------------------------- */
export function parseInvoiceCSV(fileText, loggedInBrokerEmail, brokerTimezone = "America/New_York") {
  const parsed = Papa.parse(fileText, { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length === 0) throw new Error("CSV is empty or invalid.");

  return mapRowsForDB(parsed.data, loggedInBrokerEmail, brokerTimezone);
}
