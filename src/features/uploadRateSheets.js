// src/features/uploadRateSheets.js
import { supabase } from "../supabaseClient";

export const uploadRateSheets = async (file) => {
  if (!file) return alert("Please select a file first.");

  try {
    const { data, error } = await supabase.storage
      .from("ratesheets")
      .upload(file.name, file);

    if (error) throw error;

    // Insert a row in uploads table
    const { error: dbError } = await supabase.from("uploads").insert([
      {
        filename: file.name,
        type: "ratesheet",
        bucket: "ratesheets",
        uploaded_by: supabase.auth.user()?.id,
        uploaded_at: new Date(),
        status: "pending",
      },
    ]);

    if (dbError) throw dbError;

    alert(`Rate sheet uploaded successfully: ${file.name}`);
  } catch (err) {
    console.error("Rate sheet upload failed:", err.message);
    alert("Upload failed: " + err.message);
  }
};
