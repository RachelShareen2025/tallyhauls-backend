// src/features/generateReports.js
import { supabase } from "../supabaseClient";

/**
 * Fetches upload stats and downloads a CSV summary client-side.
 * Returns the computed stats as well.
 */
export async function generateReports() {
  // Pull everything (scope with RLS to current user in your policies)
  const { data, error } = await supabase
    .from("uploads")
    .select("id, filename, type, bucket, status, uploaded_by, uploaded_at, path, error_details")
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  // Aggregate stats
  const stats = {
    total: data.length,
    byStatus: { pending: 0, success: 0, error: 0, cleared: 0 },
    byType: { invoice: 0, ratesheet: 0 },
  };

  for (const row of data) {
    if (stats.byStatus[row.status] !== undefined) stats.byStatus[row.status] += 1;
    if (stats.byType[row.type] !== undefined) stats.byType[row.type] += 1;
  }

  // Build CSV
  const header = [
    "id",
    "filename",
    "type",
    "bucket",
    "status",
    "uploaded_by",
    "uploaded_at",
    "path",
    "error_details",
  ];
  const lines = [header.join(",")];
  for (const row of data) {
    const line = [
      row.id,
      safe(row.filename),
      row.type,
      row.bucket,
      row.status,
      row.uploaded_by,
      row.uploaded_at,
      safe(row.path),
      safe(row.error_details),
    ].join(",");
    lines.push(line);
  }
  const csv = lines.join("\n");

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.download = `tallyhauls-report-${ts}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { stats, rows: data };
}

function safe(val) {
  if (val == null) return "";
  // Escape quotes and wrap in quotes to keep commas safe
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}
