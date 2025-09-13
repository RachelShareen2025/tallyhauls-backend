// src/features/uploadFileToStorage.js
import { supabase } from "../supabaseClient";

export async function uploadFileToStorage(file) {
  if (!file) {
    console.error("No file provided to uploadFileToStorage.");
    return { success: false, error: "No file provided" };
  }

  try {
    const filePath = `invoices/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
      .from("invoices")
      .getPublicUrl(uploadData.path);

    if (publicUrlError) throw publicUrlError;

    return { success: true, fileUrl: publicUrlData.publicUrl };
  } catch (err) {
    console.error("❌ Storage upload failed:", err.message);
    return { success: false, error: err.message };
  }
}
