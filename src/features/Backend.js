// src/features/Backend.js
import { supabase } from "../supabaseClient";
import { parseInvoiceCSV } from "./parser";
import { DateTime } from "luxon";

/* -----------------------------
   1️⃣ Fetch Broker KPIs (DB-safe)
----------------------------- */
export async function fetchKPIsForBroker(sessionUser) {
  if (!sessionUser?.email) return { success: false, error: "User session missing." };

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        projectedCashFlow:sum(total_charge) - sum(carrier_pay),
        actualCashFlow:sum(case when shipper_paid then total_charge else 0 end) - sum(case when carrier_paid then carrier_pay else 0 end),
        totalReceivables:sum(case when shipper_paid = false then total_charge else 0 end),
        totalPayables:sum(case when carrier_paid = false then carrier_pay else 0 end),
        overdueShipperAmount:sum(case when shipper_paid = false and shipper_due < now() then total_charge else 0 end),
        overdueCarrierAmount:sum(case when carrier_paid = false and carrier_due < now() then carrier_pay else 0 end)
      `)
      .eq("broker_email", sessionUser.email)
      .single();

    if (error) throw error;

    const kpis = {
      projectedCashFlow: parseFloat(data.projectedCashFlow || 0),
      actualCashFlow: parseFloat(data.actualCashFlow || 0),
      totalReceivables: parseFloat(data.totalReceivables || 0),
      totalPayables: parseFloat(data.totalPayables || 0),
      overdueShipperAmount: parseFloat(data.overdueShipperAmount || 0),
      overdueCarrierAmount: parseFloat(data.overdueCarrierAmount || 0),
    };

    return { success: true, kpis };
  } catch (err) {
    console.error("DB KPI fetch failed:", err.message);
    return { success: false, error: err.message };
  }
}

/* -----------------------------
   2️⃣ Upload File to Storage
----------------------------- */
export const uploadFileToStorage = async (file, isFailed = false) => {
  if (!file) return { success: false, error: "File missing" };
  try {
    const folder = isFailed ? "failed_csvs" : "invoices";
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from(folder).upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: publicUrlData, error: publicUrlError } = await supabase.storage.from(folder).getPublicUrl(uploadData.path);
    if (publicUrlError) throw publicUrlError;

    return { success: true, fileUrl: publicUrlData.publicUrl };
  } catch (err) {
    console.error("Storage upload failed:", err.message);
    return { success: false, error: err.message };
  }
};

/* -----------------------------
   3️⃣ Upload & Insert Invoices (validated, RLS-safe)
----------------------------- */
export const uploadInvoiceFile = async (file, sessionUser) => {
  if (!sessionUser?.email) {
    return { success: false, error: "User session missing." };
  }

  try {
    // Determine broker timezone safely
    const brokerTimezone = sessionUser.timezone || "America/New_York";

    // 1️⃣ Upload file to storage
    const storageRes = await uploadFileToStorage(file);
    if (!storageRes.success) return storageRes;

    // 2️⃣ Read CSV content
    const fileText = await file.text();
    let parsedRows;
    try {
      parsedRows = parseInvoiceCSV(fileText, sessionUser.email, brokerTimezone);
    } catch (err) {
      // Optional: mark file as failed
      await uploadFileToStorage(file, true);
      return { success: false, error: `CSV parsing failed: ${err.message}` };
    }

    // 3️⃣ Filter valid rows
    const validRows = parsedRows.filter(row =>
      row.load_number && !isNaN(row.total_charge) && !isNaN(row.carrier_pay)
    );

    if (!validRows.length) return { success: false, error: "No valid rows found in CSV." };

    // ⚡ Backfill broker_timezone for each row
    const nowISO = new Date().toISOString();
    const rowsWithFileUrl = validRows.map(row => ({
      ...row,
      file_url: storageRes.fileUrl,
      created_at: nowISO,
      updated_at: nowISO,
      broker_timezone: brokerTimezone // ✅ add this
    }));

    // 4️⃣ Insert rows (RLS-safe)
    const { data, error } = await supabase.from("invoices").insert(rowsWithFileUrl);
    if (error) throw error;

    return { success: true, data, fileUrl: storageRes.fileUrl };
  } catch (err) {
    console.error("Upload failed:", err.message);
    return { success: false, error: err.message };
  }
};


/* -----------------------------
   4️⃣ Update Single or Bulk Invoice Status
----------------------------- */
export const updateInvoiceStatus = async (invoiceId, field, value) => {
  try {
    const { error } = await supabase.from("invoices")
      .update({ [field]: value, updated_at: DateTime.utc().toISO() })
      .eq("id", invoiceId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Update failed:", err.message);
    return { success: false, error: err.message };
  }
};

export const bulkUpdateInvoiceStatus = async (invoiceIds, field, value) => {
  try {
    const { error } = await supabase.from("invoices")
      .update({ [field]: value, updated_at: DateTime.utc().toISO() })
      .in("id", invoiceIds);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Bulk update failed:", err.message);
    return { success: false, error: err.message };
  }
};

/* -----------------------------
   5️⃣ Compute & Update Status
----------------------------- */
export const computeAndUpdateStatus = async (sessionUser, pageSize = 100) => {
  if (!sessionUser?.email) return { success: false, error: "User session missing." };

  try {
    let lastId = null;
    let moreRows = true;

    while (moreRows) {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("broker_email", sessionUser.email)
        .order("id", { ascending: true })
        .limit(pageSize);

      if (lastId) query = query.gt("id", lastId);

      const { data: invoices, error } = await query;
      if (error) throw error;
      if (!invoices?.length) break;

      const updates = invoices.map(inv => {
        let status = "pending";
        if (inv.flagged_reason) status = "flagged";
        else if (inv.shipper_paid && inv.carrier_paid) status = "paid";
        else {
          const todayUTC = DateTime.utc();
          const shipperDue = inv.shipper_due ? DateTime.fromISO(inv.shipper_due, { zone: "utc" }) : null;
          const carrierDue = inv.carrier_due ? DateTime.fromISO(inv.carrier_due, { zone: "utc" }) : null;
          if ((!inv.shipper_paid && shipperDue && shipperDue < todayUTC) ||
              (!inv.carrier_paid && carrierDue && carrierDue < todayUTC)) status = "overdue";
        }
        return { id: inv.id, status };
      });

      // Batch upsert 50 at a time
      for (let i = 0; i < updates.length; i += 50) {
        const batch = updates.slice(i, i + 50);
        const { error: updateError } = await supabase.from("invoices").upsert(batch, { onConflict: ["id"] });
        if (updateError) console.error("Status update error:", updateError.message);
      }

      lastId = invoices[invoices.length - 1].id;
      moreRows = invoices.length === pageSize;
    }

    return { success: true };
  } catch (err) {
    console.error("Compute status failed:", err.message);
    return { success: false, error: err.message };
  }
};

/* -----------------------------
   6️⃣ Fetch Invoices Paginated
----------------------------- */
export const fetchInvoicesPaginated = async (sessionUser, pageSize = 50, cursor = null) => {
  if (!sessionUser?.email) return { success: false, error: "User session missing." };

  try {
    let query = supabase
      .from("invoices")
      .select(`
        id, load_number, total_charge, carrier_pay, shipper_paid, carrier_paid,
        shipper_due, carrier_due, shipper, carrier, file_url
      `)
      .eq("broker_email", sessionUser.email)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (cursor) query = query.gt("id", cursor);

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === pageSize ? data[data.length - 1].id : null;
    return { success: true, data, nextCursor };
  } catch (err) {
    console.error("Fetch invoices paginated failed:", err.message);
    return { success: false, error: err.message };
  }
};
