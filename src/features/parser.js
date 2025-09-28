// src/features/parser.js
import Papa from "papaparse";
import { getFlaggedReason } from "./flaggedReasons";


/* -----------------------------
   Helper: Normalize any header or alias
----------------------------- */
const normalizeKey = key =>
  key?.trim().toLowerCase().replace(/[\s_]+/g, "");


/* -----------------------------
   Alias Map (normalized at startup)
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
   Helper: Get CSV value by alias list
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
   Helper: Robust U.S. Number Parser
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
   Helper: Global flexible date parser
----------------------------- */
const parseDate = (input) => {
  if (!input) return null;
  input = input.trim();
  let date = new Date(input);
  if (!isNaN(date)) return date;


  const patterns = [
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parse: (d, m, y) => new Date(y, m - 1, d) },
    { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, parse: (d, m, y) => new Date(y, m - 1, d) },
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, parse: (d, m, y) => new Date(y, m - 1, d) },
    { regex: /^(\d{2})\/(\d{2})\/(\d{2})$/, parse: (d, m, y) => new Date(2000 + y, m - 1, d) },
    { regex: /^(\d{2})\.(\d{2})\.(\d{2})$/, parse: (d, m, y) => new Date(2000 + y, m - 1, d) },
    { regex: /^(\d{2})-(\d{2})-(\d{2})$/, parse: (d, m, y) => new Date(2000 + y, m - 1, d) },
    { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, parse: (y, m, d) => new Date(y, m - 1, d) },
    { regex: /^(\d{4})\.(\d{2})\.(\d{2})$/, parse: (y, m, d) => new Date(y, m - 1, d) },
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: (y, m, d) => new Date(y, m - 1, d) },
  ];


  for (let { regex, parse } of patterns) {
    const match = input.match(regex);
    if (match) {
      const [, ...groups] = match;
      date = parse(...groups.map(Number));
      if (!isNaN(date)) return date;
    }
  }


  const textualDate = Date.parse(input);
  if (!isNaN(textualDate)) return new Date(textualDate);


  return null;
};


/* -----------------------------
   Map CSV rows to DB-ready objects
----------------------------- */
export function mapRowsForDB(rows, loggedInBrokerEmail) {
  if (!rows || rows.length === 0) throw new Error("CSV is empty or invalid.");


  return rows.map(row => {
    const loadNumber = getCsvValue(row, csvMap.load_number)?.trim();
    const totalCharge = parseNumber(getCsvValue(row, csvMap.total_charge));
    const carrierPay = parseNumber(getCsvValue(row, csvMap.carrier_pay));
    const billDateRaw = getCsvValue(row, csvMap.bill_date);
    const billDateObj = parseDate(billDateRaw);
    const billDateFormatted =
      billDateObj && !isNaN(billDateObj)
        ? billDateObj.toISOString().split("T")[0]
        : null;


    const shipperVal = getCsvValue(row, csvMap.shipper)?.trim();
    const carrierVal = getCsvValue(row, csvMap.carrier)?.trim();


    // ✅ flagged_reason now includes duplicate-per-broker check
    const flaggedReason = getFlaggedReason(
      {
        load_number: loadNumber,
        bill_date: billDateFormatted,
        shipper: shipperVal,
        carrier: carrierVal,
        total_charge: parseFloat(totalCharge.toFixed(2)),
        carrier_pay: parseFloat(carrierPay.toFixed(2)),
        shipper_paid: false,
        carrier_paid: false,
        shipper_due: billDateObj
          ? new Date(billDateObj.getTime() + 30 * 86400000)
              .toISOString()
              .split("T")[0]
          : null,
        carrier_due: billDateObj
          ? new Date(billDateObj.getTime() + 15 * 86400000)
              .toISOString()
              .split("T")[0]
          : null,
        broker_email: loggedInBrokerEmail
      },
      rows // ✅ pass all rows to detect duplicates per broker
    );


    return {
      load_number: loadNumber,
      bill_date: billDateFormatted,
      shipper: shipperVal,
      total_charge: parseFloat(totalCharge.toFixed(2)),
      shipper_terms: "Net 30",
      shipper_due: billDateObj
        ? new Date(billDateObj.getTime() + 30 * 86400000)
            .toISOString()
            .split("T")[0]
        : null,
      shipper_paid: false,
      carrier: carrierVal,
      carrier_pay: parseFloat(carrierPay.toFixed(2)),
      carrier_terms: "Net 15",
      carrier_due: billDateObj
        ? new Date(billDateObj.getTime() + 15 * 86400000)
            .toISOString()
            .split("T")[0]
        : null,
      carrier_paid: false,
      broker_email: loggedInBrokerEmail, // ✅ always set
      flagged_reason: flaggedReason,     // ✅ always set
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_url: row.file_url || null
    };
  });
}


/* -----------------------------
   Convenience function to parse CSV and map for DB
----------------------------- */
export function parseInvoiceCSV(fileText, loggedInBrokerEmail) {
  const parsed = Papa.parse(fileText, { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length === 0) throw new Error("CSV is empty or invalid.");


  return mapRowsForDB(parsed.data, loggedInBrokerEmail);
}


