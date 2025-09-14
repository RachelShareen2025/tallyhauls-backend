// src/features/uploadFileToStorage.js
import { supabase } from "../supabaseClient";

/**
 * Uploads a file to Supabase storage under broker-specific folder.
 * @param {File} file - The CSV file
 * @param {string} brokerEmail - Email of the broker
 * @param {boolean} [isFailed=false] - Whether this is a failed CSV
 * @returns {Promise<{success: boolean, fileUrl?: string, error?: string}>}
 */
export async function uploadFileToStorage(file, brokerEmail, isFailed = false) {
  if (!file || !brokerEmail) {
    return { success: false, error: "File or broker email missing" };
  }

  try {
    const safeEmail = brokerEmail.replace(/[@.]/g, "_"); // sanitize for path
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
    console.error("❌ Storage upload failed:", err.message);
    return { success: false, error: err.message };
  }
}
