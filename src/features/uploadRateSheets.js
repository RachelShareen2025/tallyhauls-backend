// src/features/uploadRateSheets.js
import { supabase } from "../supabaseClient";

const sanitizeFileName = (name) => name.replace(/[^\w.\-]+/g, "_");

export const uploadRateSheets = async (file, brokerId) => {
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  try {
    // Unique path in 'ratesheets' bucket
    const path = `${brokerId || "anon"}/${Date.now()}-${sanitizeFileName(file.name)}`;

    // Upload to 'ratesheets' bucket
    const { data: storageData, error: storageErr } = await supabase.storage
      .from("ratesheets")
      .upload(path, file, { upsert: true });

    if (storageErr) throw storageErr;

    // Get public URL
    const { publicUrl } = supabase.storage.from("ratesheets").getPublicUrl(path);

    // Get current user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const uploaderId = userData?.user?.id || null;

    // Insert into ratesheets table
    const { error: dbErr } = await supabase.from("ratesheets").insert([
      {
        file_url: publicUrl,
        file_name: file.name,
        file_type: "ratesheet",
        uploaded_at: new Date().toISOString(),
        uploader_id: uploaderId,
        broker_id: brokerId || null,
        parse_status: null,
      },
    ]);
    if (dbErr) throw dbErr;

    alert(`✅ Rate sheet uploaded successfully: ${file.name}`);
  } catch (err) {
    console.error("Rate sheet upload failed:", err.message);
    alert("❌ Upload failed: " + err.message);
  }
};
