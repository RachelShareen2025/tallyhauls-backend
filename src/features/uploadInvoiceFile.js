import { supabase } from "../supabaseClient";
import Papa from "papaparse";

export async function uploadInvoiceFile(file) {
  try {
    if (!file) {
      console.error("No file provided to uploadInvoiceFile.");
      return { success: false, error: "No file provided" };
    }

    console.log("📂 File selected:", file);

    // 1️⃣ Upload file to Supabase Storage
    const filePath = `invoices/${Date.now()}_${file.name}`;
    console.log("Uploading file to path:", filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    console.log("✅ File uploaded successfully:", uploadData);

    // 2️⃣ Get public URL
    const { data: publicUrlData, error: publicUrlError } = supabase.storage
      .from("invoices")
      .getPublicUrl(uploadData.path);

    if (publicUrlError) {
      console.error("❌ Error getting public URL:", publicUrlError);
      return { success: false, error: publicUrlError.message };
    }

    const fileUrl = publicUrlData.publicUrl;
    console.log("🔗 Public file URL:", fileUrl);

    // 3️⃣ Parse CSV file
    const csvText = await file.text();
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    console.log("📊 Parsed CSV rows:", rows);

    if (!rows || rows.length === 0) {
      console.warn("⚠️ CSV is empty or headers don't match expected format.");
      return { success: false, error: "CSV is empty or invalid" };
    }

    // 4️⃣ Map CSV rows to mandatory fields for DB
    const invoiceRows = rows.map((row) => ({
      invoice_number: row["Invoice #"] || null,
      invoice_date: row["Invoice Date"] || null,
      client_name: row["Customer Name"] || null,   // ✅ FIXED
      load_number: row["Load #"] || null,          // ✅ FIXED
      carrier_name: row["Carrier Name"] || null,
      amount: parseFloat(row["Amount"]) || 0,
      status: row["Status"] || "Unpaid",
      projected_cash_date: row["Projected Cash Date"] || null,
      due_date: row["Due Date"] || null,
      notes: row["Notes"] || "",
      file_url: fileUrl,
    }));

    console.log("💾 Rows to insert into DB:", invoiceRows);

    // 5️⃣ Insert all invoice rows into Supabase
    const { error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceRows);

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("✅ All rows inserted successfully!");

    return { success: true, fileUrl };
  } catch (err) {
    console.error("🔥 Unexpected error:", err);
    return { success: false, error: err.message };
  }
}
