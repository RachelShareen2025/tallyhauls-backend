// src/features/uploadRateSheets.js
import { supabase } from "../supabaseClient";

export const uploadRateSheets = async (file) => {
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  try {
    // Upload to storage bucket
    const { data, error } = await supabase.storage
      .from("ratesheets")
      .upload(file.name, file, { upsert: true }); // upsert avoids duplicate errors

    if (error) throw error;

    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const userId = userData?.user?.id || null;

    // Insert metadata row in "uploads" table
    const { error: dbError } = await supabase.from("uploads").insert([
      {
        filename: file.name,
        type: "ratesheet",
        bucket: "ratesheets",
        uploaded_by: userId,
        uploaded_at: new Date(),
        status: "pending",
      },
    ]);

    if (dbError) throw dbError;

    alert(`✅ Rate sheet uploaded successfully: ${file.name}`);
  } catch (err) {
    console.error("Rate sheet upload failed:", err.message);
    alert("❌ Upload failed: " + err.message);
  }
};
