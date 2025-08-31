// src/features/reconcileInvoice.js
import { supabase } from "../supabaseClient";

// Single invoice reconciliation
export const reconcileInvoice = async (invoiceId, ratesheetId) => {
  try {
    // Placeholder reconciliation logic — will plug in OCR later
    const status = "matched"; // or 'mismatch' if logic detects errors
    const errors = status === "mismatch" ? "Rate mismatch found" : null;

    const { data, error } = await supabase
      .from("reconciliation")
      .upsert([
        {
          invoice_id: invoiceId,
          ratesheet_id: ratesheetId,
          status,
          errors,
          processed_at: new Date(),
        },
      ])
      .eq("invoice_id", invoiceId)
      .eq("ratesheet_id", ratesheetId);

    if (error) throw error;

    console.log("Reconciliation processed:", data);
    alert("Reconciliation successfully processed!");
  } catch (err) {
    console.error("Reconciliation failed:", err.message);
    alert("Reconciliation failed: " + err.message);
  }
};

// Get all invoices with errors and match them to rate sheets
export const getReconciliationTargets = async () => {
  try {
    const { data, error } = await supabase
      .from("uploads")
      .select("id, filename, type, status, reconciliation_id")
      .eq("status", "Error"); // only failed ones

    if (error) throw error;

    // Match invoices to their rate sheets
    const targets = data
      .filter((item) => item.type.toLowerCase() === "invoice")
      .map((invoice) => {
        const rateSheet = data.find(
          (r) =>
            r.type.toLowerCase() === "ratesheet" &&
            r.reconciliation_id === invoice.reconciliation_id
        );
        return {
          invoiceId: invoice.id,
          ratesheetId: rateSheet?.id || null,
        };
      });

    return targets;
  } catch (err) {
    console.error("Failed to fetch reconciliation targets:", err.message);
    return [];
  }
};

// Optional: bulk reconcile all error invoices
export const reconcileAllErrors = async () => {
  const targets = await getReconciliationTargets();
  for (const t of targets) {
    if (t.ratesheetId) {
      await reconcileInvoice(t.invoiceId, t.ratesheetId);
    }
  }
};
