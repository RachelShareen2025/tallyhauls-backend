// src/features/uploadInvoiceFile.js
import { supabase } from "../supabaseClient";

const sanitizeFileName = (name) => name.replace(/[^\w.\-]+/g, "_");

export async function uploadInvoiceFile(file) {
  if (!file) throw new Error("No file provided.");

  // Get user (v2 API)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData?.user?.id || "anon";

  // Always-unique storage path
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  // Upload to 'invoices' bucket
  const { data: storageData, error: storageErr } = await supabase.storage
    .from("invoices")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (storageErr) throw storageErr;

  // Insert metadata row
  const { error: dbErr } = await supabase.from("uploads").insert([
    {
      filename: file.name,
      path,
      type: "invoice",
      bucket: "invoices",
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: "pending",
    },
  ]);
  if (dbErr) throw dbErr;

  return storageData;
}
