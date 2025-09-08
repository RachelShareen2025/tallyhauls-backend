import { supabase } from "../supabaseClient";
import Papa from "papaparse";

export async function uploadInvoiceFile(file) {
  try {
    // 1️⃣ Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(`invoices/${Date.now()}_${file.name}`, file);

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      throw uploadError;
    }

    // 2️⃣ Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(uploadData.path);

    const fileUrl = publicUrlData.publicUrl;

    // 3️⃣ Parse CSV file
    const csvText = await file.text();
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;

    // 4️⃣ Map CSV rows to mandatory fields for DB
    const invoiceRows = rows.map((row) => ({
      invoice_number: row["Invoice #"] || null,
      invoice_date: row["Invoice Date"] || null,
      customer_name: row["Customer Name"] || null,
      load_id: row["Load #"] || null,
      carrier_name: row["Carrier Name"] || null,
      amount: parseFloat(row["Amount"]) || 0,
      status: row["Status"] || "Unpaid",
      projected_cash_date: row["Projected Cash Date"] || null,
      due_date: row["Due Date"] || null,
      notes: row["Notes"] || "",
      file_url: fileUrl,
    }));

    // 5️⃣ Insert all invoice rows into Supabase
    const { error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceRows);

    if (insertError) {
      console.error("Insert error:", insertError.message);
      throw insertError;
    }

    return { success: true, fileUrl };
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return { success: false, error: err.message };
  }
}
