// src/features/uploadInvoiceFile.js
import { uploadFileToStorage } from "./uploadFileToStorage";
import { parseInvoiceCSV } from "./parseInvoiceCSV";
import { insertInvoices } from "./insertInvoices";

/**
 * Upload CSV, parse, and insert invoices for a specific broker
 * @param {File} file
 * @param {string} brokerEmail
 */
export async function uploadInvoiceFile(file, brokerEmail) {
  if (!brokerEmail) return { success: false, error: "Broker email required" };

  try {
    // 1️⃣ Upload original CSV to storage
    const storageRes = await uploadFileToStorage(file, brokerEmail);
    if (!storageRes.success) return storageRes;

    // 2️⃣ Parse CSV
    const fileText = await file.text();
    let parsedRows;
    try {
      parsedRows = parseInvoiceCSV(fileText);
    } catch (err) {
      // If parsing fails, store file in a separate 'failed_csvs' folder for this broker
      await uploadFileToStorage(file, brokerEmail, true); // true = failed folder
      return { success: false, error: `CSV parsing failed: ${err.message}` };
    }

    // 3️⃣ Insert into DB
    const dbRes = await insertInvoices(parsedRows, storageRes.fileUrl);
    if (!dbRes.success) return dbRes;

    return { success: true, fileUrl: storageRes.fileUrl };
  } catch (err) {
    console.error("🔥 Upload failed:", err.message);
    return { success: false, error: err.message };
  }
}
