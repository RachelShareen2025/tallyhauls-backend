// src/features/uploadInvoices.js
import { supabase } from "../supabaseClient";

export const uploadInvoices = async (file) => {
  if (!file) return alert("Please select a file first.");

  try {
    const { data, error } = await supabase.storage
      .from("invoices")
      .upload(file.name, file);

    if (error) throw error;

    // Insert a row in uploads table
    const { error: dbError } = await supabase.from("uploads").insert([
      {
        filename: file.name,
        type: "invoice",
        bucket: "invoices",
        uploaded_by: supabase.auth.user()?.id,
        uploaded_at: new Date(),
        status: "pending",
      },
    ]);

    if (dbError) throw dbError;

    alert(`Invoice uploaded successfully: ${file.name}`);
  } catch (err) {
    console.error("Invoice upload failed:", err.message);
    alert("Upload failed: " + err.message);
  }
};
