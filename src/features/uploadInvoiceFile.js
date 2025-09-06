import { supabase } from "../supabaseClient";

const sanitizeFileName = (name) => name.replace(/[^\w.\-]+/g, "_");

export async function uploadInvoiceFile(file, type = "invoice", brokerId = null) {
  if (!file) throw new Error("No file provided.");

  // Get logged-in user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uploaderId = userData?.user?.id || "anon";

  // Unique path in 'invoices' bucket
  const path = `${uploaderId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  // Upload to 'invoices' bucket
  const { data: storageData, error: storageErr } = await supabase.storage
    .from("invoices")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (storageErr) throw storageErr;

  // Get public URL
  const { publicUrl } = supabase.storage.from("invoices").getPublicUrl(path);

  // Insert into invoices table
  const { error: dbErr } = await supabase.from("invoices").insert([
    {
      file_url: publicUrl,
      file_name: file.name,
      file_type: type,            // dynamic type: "invoice" or "ratesheet"
      uploaded_at: new Date().toISOString(),
      uploader_id: uploaderId,
      broker_id: brokerId,
    },
  ]);
  if (dbErr) throw dbErr;

  return storageData;
}
