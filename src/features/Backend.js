// src/features/Backend.js
import { supabase } from "../supabaseClient";
import { parseInvoiceCSV } from "./parser";


/* -----------------------------
   1️⃣ KPI Calculations
----------------------------- */
function getTodayUTC() {
  return new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ));
}


export function calculateProjectedNetCashFlow(rows) {
  const totalCharges = rows.reduce((sum, r) => sum + Number(r.total_charge || 0), 0);
  const totalCarrierPay = rows.reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);
  return parseFloat((totalCharges - totalCarrierPay).toFixed(2));
}


export function calculateActualNetCashFlow(rows) {
  const collected = rows
    .filter(r => r.shipper_paid)
    .reduce((sum, r) => sum + Number(r.total_charge || 0), 0);


  const paid = rows
    .filter(r => r.carrier_paid)
    .reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);


  return parseFloat((collected - paid).toFixed(2));
}


export function calculateTotalReceivables(rows) {
  return rows
    .filter(r => !r.shipper_paid)
    .reduce((sum, r) => sum + Number(r.total_charge || 0), 0);
}


export function calculateTotalPayables(rows) {
  return rows
    .filter(r => !r.carrier_paid)
    .reduce((sum, r) => sum + Number(r.carrier_pay || 0), 0);
}


export function calculateOverdueShipperAmount(rows) {
  const todayUTC = getTodayUTC();
  return rows.reduce((sum, r) => {
    if (!r.shipper_paid && r.shipper_due) {
      const dueUTC = new Date(r.shipper_due);
      if (!isNaN(dueUTC) && todayUTC > dueUTC) {
        return sum + Number(r.total_charge || 0);
      }
    }
    return sum;
  }, 0);
}


export function calculateOverdueCarrierAmount(rows) {
  const todayUTC = getTodayUTC();
  return rows.reduce((sum, r) => {
    if (!r.carrier_paid && r.carrier_due) {
      const dueUTC = new Date(r.carrier_due);
      if (!isNaN(dueUTC) && todayUTC > dueUTC) {
        return sum + Number(r.carrier_pay || 0);
      }
    }
    return sum;
  }, 0);
}


export function computeKPIs(rows) {
  return {
    projectedCashFlow: calculateProjectedNetCashFlow(rows),
    actualCashFlow: calculateActualNetCashFlow(rows),
    totalReceivables: calculateTotalReceivables(rows),
    totalPayables: calculateTotalPayables(rows),
    overdueShipperAmount: calculateOverdueShipperAmount(rows),
    overdueCarrierAmount: calculateOverdueCarrierAmount(rows),
  };
}
/* -----------------------------
   3️⃣ Fetch KPIs for Broker
----------------------------- */
export async function fetchKPIs(brokerEmail, pageSize = 100) {
  try {
    let allInvoices = [];
    let lastId = null;
    let moreRows = true;

    while (moreRows) {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("broker_email", brokerEmail)
        .order("id", { ascending: true })
        .limit(pageSize);

      if (lastId) query = query.gt("id", lastId);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) break;

      allInvoices = [...allInvoices, ...data];

      lastId = data[data.length - 1].id;
      moreRows = data.length === pageSize;
    }

    const kpis = computeKPIs(allInvoices);
    return { success: true, kpis };
  } catch (err) {
    console.error("Fetch KPIs failed:", err.message);
    return { success: false, error: err.message };
  }
}


/* -----------------------------
   2️⃣ Insert Invoices
----------------------------- */
export async function insertInvoices(rows, fileUrl, brokerEmail) {
  try {
    const rowsWithDueDates = rows.map(row => {
      const billDateObj = row.bill_date ? new Date(row.bill_date) : null;


      return {
        ...row,
        broker_email: row.broker_email || brokerEmail, // ✅ attach broker email
        file_url: fileUrl,
        shipper_due: row.shipper_due || (billDateObj ? new Date(billDateObj.getTime() + 30 * 86400000).toISOString().split("T")[0] : null),
        carrier_due: row.carrier_due || (billDateObj ? new Date(billDateObj.getTime() + 15 * 86400000).toISOString().split("T")[0] : null),
      };
    });


    const { error } = await supabase.from("invoices").insert(rowsWithDueDates);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("DB insert failed:", err.message);
    return { success: false, error: err.message };
  }
}


/* -----------------------------
   4️⃣ Upload File to Storage
----------------------------- */
export async function uploadFileToStorage(file, brokerEmail, isFailed = false) {
  if (!file || !brokerEmail) return { success: false, error: "File or broker email missing" };
  try {
    const safeEmail = brokerEmail.replace(/[@.]/g, "_");
    const folder = isFailed ? "failed_csvs" : "invoices";
    const filePath = `${folder}/${safeEmail}/${Date.now()}_${file.name}`;


    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(folder)
      .upload(filePath, file);
    if (uploadError) throw uploadError;


    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
      .from(folder)
      .getPublicUrl(uploadData.path);
    if (publicUrlError) throw publicUrlError;


    return { success: true, fileUrl: publicUrlData.publicUrl };
  } catch (err) {
    console.error("Storage upload failed:", err.message);
    return { success: false, error: err.message };
  }
}


/* -----------------------------
   5️⃣ Upload & Insert Invoices
----------------------------- */
export async function uploadInvoiceFile(file, brokerEmail) {
  if (!brokerEmail) return { success: false, error: "Broker email required" };
  try {
    const storageRes = await uploadFileToStorage(file, brokerEmail);
    if (!storageRes.success) return storageRes;


    const fileText = await file.text();
    let parsedRows;
    try {
      parsedRows = parseInvoiceCSV(fileText);
      // ✅ attach broker_email to every row if parser doesn't already
      parsedRows = parsedRows.map(row => ({ ...row, broker_email: brokerEmail }));
    } catch (err) {
      await uploadFileToStorage(file, brokerEmail, true);
      return { success: false, error: `CSV parsing failed: ${err.message}` };
    }


    const dbRes = await insertInvoices(parsedRows, storageRes.fileUrl, brokerEmail);
    await computeAndUpdateStatus(brokerEmail);
    if (!dbRes.success) return dbRes;


    return { success: true, fileUrl: storageRes.fileUrl };
  } catch (err) {
    console.error("Upload failed:", err.message);
    return { success: false, error: err.message };
  }
}


/* -----------------------------
   6️⃣ Update Invoice Status
----------------------------- */
export async function updateInvoiceStatus(invoiceId, field, value) {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);


    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Update failed:", err.message);
    return { success: false, error: err.message };
  }
}


/* -----------------------------
   7️⃣ Bulk Update Invoice Status
----------------------------- */
export async function bulkUpdateInvoiceStatus(invoiceIds, field, value) {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .in("id", invoiceIds);


    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Bulk update failed:", err.message);
    return { success: false, error: err.message };
  }
}
/* -----------------------------
   8️⃣ Update Invoice Status After Upload
----------------------------- */
export async function computeAndUpdateStatus(brokerEmail, pageSize = 100) {
  try {
    let lastId = null;
    let moreRows = true;

    while (moreRows) {
      // 1️⃣ Fetch a page of invoices
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("broker_email", brokerEmail)
        .order("id", { ascending: true })
        .limit(pageSize);

      if (lastId) query = query.gt("id", lastId);

      const { data: invoices, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!invoices || invoices.length === 0) break;

      // 2️⃣ Prepare updates for this page
      const updates = invoices.map(inv => {
        let newStatus = "pending";

        if (inv.flagged_reason) newStatus = "flagged";
        else if (inv.shipper_paid && inv.carrier_paid) newStatus = "paid";
        else {
          const today = new Date();
          const shipperDue = inv.shipper_due ? new Date(inv.shipper_due) : null;
          const carrierDue = inv.carrier_due ? new Date(inv.carrier_due) : null;

          if ((!inv.shipper_paid && shipperDue && shipperDue < today) ||
              (!inv.carrier_paid && carrierDue && carrierDue < today)) {
            newStatus = "overdue";
          }
        }

        return { id: inv.id, status: newStatus };
      });

      // 3️⃣ Bulk upsert the page
      for (let i = 0; i < updates.length; i += 50) { // batches of 50
        const batch = updates.slice(i, i + 50);
        const { error: updateError } = await supabase
          .from("invoices")
          .upsert(batch, { onConflict: ["id"] });
        if (updateError) console.error("Status update error:", updateError.message);
      }

      // 4️⃣ Prepare next page
      lastId = invoices[invoices.length - 1].id;
      moreRows = invoices.length === pageSize;
    }

    return { success: true };
  } catch (err) {
    console.error("Compute status failed:", err.message);
    return { success: false, error: err.message };
  }
}
/* -----------------------------
   9️⃣ Fetch Invoices Paginated
----------------------------- */
export async function fetchInvoicesPaginated(brokerEmail, pageSize = 50, cursor = null) {
  try {
    let query = supabase
      .from("invoices")
      .select("*")
      .eq("broker_email", brokerEmail)
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
}
