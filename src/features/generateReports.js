// src/features/generateReports.js
import { supabase } from "../supabaseClient";

export const generateReports = async () => {
  try {
    const { data: invoices, error } = await supabase
      .from("uploads")
      .select("*");

    if (error) throw error;

    // Simple CSV export
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Filename,Type,Bucket,Status,Amount"]
        .concat(
          invoices.map(
            (i) =>
              `${i.id},${i.filename},${i.type},${i.bucket},${i.status},${
                i.amount || ""
              }`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tallyhauls_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Report generation failed:", err.message);
    alert("Report generation failed: " + err.message);
  }
};
