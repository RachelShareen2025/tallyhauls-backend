// src/features/insertInvoices.js
import { supabase } from "../supabaseClient";

export async function insertInvoices(rows, fileUrl) {
  try {
    const rowsWithFile = rows.map(row => ({ ...row, file_url: fileUrl }));
    const { error } = await supabase.from("invoices").insert(rowsWithFile);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("❌ DB insert failed:", err.message);
    return { success: false, error: err.message };
  }
}
