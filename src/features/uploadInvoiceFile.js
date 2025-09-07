import { supabase } from "../supabaseClient";

export async function uploadInvoiceFile(file) {
  try {
    // 1. Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("invoices")
      .upload(`invoices/${Date.now()}_${file.name}`, file);

    if (error) {
      console.error("Upload error:", error.message);
      throw error;
    }

    // 2. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(data.path);

    const fileUrl = publicUrlData.publicUrl;

    // 3. Insert record into invoices table
    const { error: insertError } = await supabase.from("invoices").insert([
      {
        file_name: file.name,
        file_url: fileUrl,
        status: "pending", // default
      },
    ]);

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
