// src/features/uploadInvoiceFile.js
import { uploadFileToStorage } from "./uploadFileToStorage";
import { parseInvoiceCSV } from "./parseInvoiceCSV";
import { insertInvoices } from "./insertInvoices";

export async function uploadInvoiceFile(file) {
  try {
    // 1️⃣ Upload to storage
    const storageRes = await uploadFileToStorage(file);
    if (!storageRes.success) return storageRes;

    // 2️⃣ Parse CSV
    const fileText = await file.text();
    let parsedRows;
    try {
      parsedRows = parseInvoiceCSV(fileText);
    } catch (err) {
      return { success: false, error: err.message };
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
