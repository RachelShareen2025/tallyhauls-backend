import * as XLSX from "xlsx-style";
import { supabase } from "../supabaseClient";

export async function generateReports() {
  try {
    // 1. Fetch all invoices with full schema
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `id, invoice_number, invoice_date, customer_name, carrier_name, amount,
         payment_terms, load_id, status, flagged, projected_cash_date,
         uploaded_at, file_url`
      )
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      alert("No invoices found for report.");
      return;
    }

    // 2. Format data for Excel export
    const rows = data.map((inv) => ({
      ID: inv.id,
      "Invoice #": inv.invoice_number,
      "Invoice Date": inv.invoice_date,
      "Customer": inv.customer_name,
      "Carrier": inv.carrier_name,
      Amount: inv.amount,
      "Payment Terms": inv.payment_terms,
      "Load ID": inv.load_id,
      Status: inv.status,
      "Flagged": inv.flagged ? "Yes" : "No",
      "Projected Cash Date": inv.projected_cash_date,
      "Uploaded At": inv.uploaded_at,
      "File URL": inv.file_url,
    }));

    // 3. Create Excel worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // 4. Highlight flagged invoices with light red background
    data.forEach((inv, i) => {
      if (inv.flagged) {
        const rowIndex = i + 2; // +2 → Excel rows start at 1 and first row is header
        const colCount = Object.keys(rows[0]).length; // dynamic col count

        for (let c = 0; c < colCount; c++) {
          const colLetter = XLSX.utils.encode_col(c); // A, B, C...
          const cellAddress = `${colLetter}${rowIndex}`;
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              fill: {
                patternType: "solid",
                fgColor: { rgb: "FFCCCC" }, // light red
              },
            };
          }
        }
      }
    });

    // 5. Create and export workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "invoice_report.xlsx", { cellStyles: true });

  } catch (err) {
    console.error("Unexpected error:", err.message);
  }
}
