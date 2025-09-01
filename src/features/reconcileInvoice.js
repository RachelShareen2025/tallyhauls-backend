// src/features/reconcileInvoice.js
import { supabase } from "../supabaseClient";

/**
 * Reconcile/resolve a discrepancy for a given upload row.
 * @param {string} uploadId - row id in "uploads" table
 * @param {"cleared"|"success"|"error"|"pending"} status - new status
 * @param {string|null} note - optional error/resolution note
 */
export async function reconcileInvoice(uploadId, status = "cleared", note = null) {
  if (!uploadId) throw new Error("uploadId is required.");

  const { error } = await supabase
    .from("uploads")
    .update({
      status,
      error_details: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uploadId);

  if (error) throw error;
  return { ok: true };
}

/**
 * Example “retry” helper that marks as pending.
 */
export async function retryUpload(uploadId) {
  return reconcileInvoice(uploadId, "pending", null);
}

/**
 * Example “fix” helper that marks as success/cleared with a note.
 */
export async function markFixed(uploadId, note = "Resolved") {
  return reconcileInvoice(uploadId, "cleared", note);
}
