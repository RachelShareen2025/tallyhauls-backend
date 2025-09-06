import { supabase } from "../supabaseClient";

export async function generateReports() {
  // Fetch all invoices uploaded by the current user
  const { data, error } = await supabase
    .from("invoices")
    .select("id, file_name, file_url, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices for report:", error.message);
    return;
  }

  // Build a simple CSV
  const header = ["id", "file_name", "file_url", "uploaded_at"];
  const lines = [header.join(",")];
  data.forEach((row) => {
    const line = [
      row.id,
      `"${row.file_name.replace(/"/g, '""')}"`,
      row.file_url,
      row.uploaded_at,
    ].join(",");
    lines.push(line);
  });

  const csv = lines.join("\n");

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.download = `tallyhauls-invoices-${ts}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { rows: data };
}
