// src/features/Backend.js
import { supabase } from "../supabaseClient";
import Papa from "papaparse";

/* -----------------------------
   1️⃣ KPI Calculations
----------------------------- */
export function calculateProjectedNetCashFlow(rows) {
  const totalCharges = rows.reduce((sum, r) => sum + Number(r.total_charge || 0), 0);
  const totalCarrierPay = rows.reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);
  return parseFloat((totalCharges - totalCarrierPay).toFixed(2));
}

export function calculateActualNetCashFlow(rows) {
  const collected = rows
    .filter(r => r.shipper_paid)
    .reduce((sum, r) => sum + Number(r.total_charge || 0), 0);

  const paid = rows
    .filter(r => r.carrier_paid)
    .reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);

  return parseFloat((collected - paid).toFixed(2));
}

export function calculateTotalReceivables(rows) {
  return rows
    .filter(r => !r.shipper_paid)
    .reduce((sum, r) => sum + Number(r.total_charge || 0), 0);
}

export function calculateTotalPayables(rows) {
  return rows
    .filter(r => !r.carrier_paid)
    .reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);
}

export function calculateOverdueShipperAmount(rows) {
  const today = new Date();
  return rows
    .filter(r => !r.shipper_paid && r.bill_date)
    .filter(r => new Date(r.bill_date).getTime() + 30 * 86400000 < today.getTime())
    .reduce((sum, r) => sum + Number(r.total_charge || 0), 0);
}

export function calculateOverdueCarrierAmount(rows) {
  const today = new Date();
  return rows
    .filter(r => !r.carrier_paid && r.bill_date)
    .filter(r => new Date(r.bill_date).getTime() + 15 * 86400000 < today.getTime())
    .reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);
}

export function computeKPIs(rows) {
  return {
    projectedCashFlow: calculateProjectedNetCashFlow(rows),
    actualCashFlow: calculateActualNetCashFlow(rows),
    totalReceivables: calculateTotalReceivables(rows),
    totalPayables: calculateTotalPayables(rows),
    overdueShipperAmount: calculateOverdueShipperAmount(rows),
    overdueCarrierAmount: calculateOverdueCarrierAmount(rows),
  };
}

/* -----------------------------
   2️⃣ Insert Invoices
----------------------------- */
export async function insertInvoices(rows, fileUrl) {
  try {
    const rowsWithFile = rows.map(row => ({ ...row, file_url: fileUrl }));
    const { error } = await supabase.from("invoices").insert(rowsWithFile);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("   DB insert failed:", err.message);
    return { success: false, error: err.message };
  }
}

/* -----------------------------
   3️⃣ Parse Invoice CSV
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
  for (let a of aliases) {
    if (row[a] !== undefined && row[a] !== "") return row[a];
  }
  return null;
};

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

    // Parse numbers safely
    const parseNumber = (val) => {
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]+/g, ""); // removes $, commas, spaces
      return parseFloat(cleaned) || 0;
    };

    const totalCharge = parseNumber(getCsvValue(row, csvMap.total_charge));
    const carrierPay = parseNumber(getCsvValue(row, csvMap.carrier_pay));

    // Normalize bill_date to YYYY-MM-DD
    const billDateRaw = getCsvValue(row, csvMap.bill_date);
    let billDateFormatted = null;
    let billDateObj = null;

    if (billDateRaw) {
      const parsedDate = new Date(billDateRaw);
      if (!isNaN(parsedDate.getTime())) {
        billDateObj = parsedDate;
        billDateFormatted = parsedDate.toISOString().split("T")[0]; // YYYY-MM-DD
      }
    }

    // Flagged reasons (overdue)
    let flaggedReason = null;
    const today = new Date();
    if (billDateObj) {
      if (new Date(billDateObj.getTime() + 30 * 86400000) < today) {
        flaggedReason = "Past Due – Shipper";
      } else if (new Date(billDateObj.getTime() + 15 * 86400000) < today) {
        flaggedReason = "Past Due – Carrier";
      }
    }

    return {
      load_number: loadNumber,
      bill_date: billDateFormatted,
      shipper: getCsvValue(row, csvMap.shipper)?.trim(),
      total_charge: parseFloat(totalCharge.toFixed(2)),
      shipper_terms: "Net 30",
      shipper_due: billDateObj
        ? new Date(billDateObj.getTime() + 30 * 86400000).toISOString().split("T")[0]
        : null,
      shipper_paid: false,
      carrier: getCsvValue(row, csvMap.carrier)?.trim(),
      carrier_pay: parseFloat(carrierPay.toFixed(2)),
      carrier_terms: "Net 15",
      carrier_due: billDateObj
        ? new Date(billDateObj.getTime() + 15 * 86400000).toISOString().split("T")[0]
        : null,
      carrier_paid: false,
      flagged_reason: flaggedReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_url: row.file_url || null,
    };
  });
}

/* -----------------------------
   4️⃣ Upload File to Storage
----------------------------- */
export async function uploadFileToStorage(file, brokerEmail, isFailed = false) {
  if (!file || !brokerEmail) return { success: false, error: "File or broker email missing" };
  try {
    const safeEmail = brokerEmail.replace(/[@.]/g, "_");
    const folder = isFailed ? "failed_csvs" : "invoices";
    const filePath = `${folder}/${safeEmail}/${Date.now()}_${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(folder)
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
      .from(folder)
      .getPublicUrl(uploadData.path);
    if (publicUrlError) throw publicUrlError;

    return { success: true, fileUrl: publicUrlData.publicUrl };
  } catch (err) {
    console.error("   Storage upload failed:", err.message);
    return { success: false, error: err.message };
  }
}

/* -----------------------------
   5️⃣ Upload & Insert Invoices
----------------------------- */
export async function uploadInvoiceFile(file, brokerEmail) {
  if (!brokerEmail) return { success: false, error: "Broker email required" };
  try {
    const storageRes = await uploadFileToStorage(file, brokerEmail);
    if (!storageRes.success) return storageRes;

    const fileText = await file.text();
    let parsedRows;
    try {
      parsedRows = parseInvoiceCSV(fileText);
    } catch (err) {
      await uploadFileToStorage(file, brokerEmail, true);
      return { success: false, error: `CSV parsing failed: ${err.message}` };
    }

    const dbRes = await insertInvoices(parsedRows, storageRes.fileUrl);
    if (!dbRes.success) return dbRes;

    return { success: true, fileUrl: storageRes.fileUrl };
  } catch (err) {
    console.error("   Upload failed:", err.message);
    return { success: false, error: err.message };
  }
}

/* -----------------------------
   6️⃣ Update Invoice Status
----------------------------- */
export async function updateInvoiceStatus(invoiceId, field, value) {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("   Update failed:", err.message);
    return { success: false, error: err.message };
  }
}

/* -----------------------------
   7️⃣ Bulk Update Invoice Status
----------------------------- */
export async function bulkUpdateInvoiceStatus(invoiceIds, field, value) {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .in("id", invoiceIds);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("    Bulk update failed:", err.message);
    return { success: false, error: err.message };
  }
}
