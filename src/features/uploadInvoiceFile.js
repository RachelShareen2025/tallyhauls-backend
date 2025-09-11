import { supabase } from "../supabaseClient";
import Papa from "papaparse";

// Normalize headers: lowercase + trim spaces
const normalizeHeader = (header) => header?.trim().toLowerCase();

// Alias mapping (all lowercase for normalization)
const csvMap = {
  load_number: ["load id", "load #", "loadnumber", "loadnum", "loadno"],
  total_charge: ["total charge", "rate", "load rate", "amount", "rate$", "charge"],
  bill_date: ["bill date", "invoice date", "date"],
  shipper: ["shipper", "customer", "client", "shipper name"],
  carrier: ["carrier", "trucking company", "transporter", "carrier name"]
};

const getCsvValue = (row, aliases) => {
  for (let a of aliases) {
    if (row[a] !== undefined && row[a] !== "") return row[a];
  }
  return null;
};

export async function uploadInvoiceFile(file) {
  try {
    if (!file) {
      console.error("No file provided to uploadInvoiceFile.");
      return { success: false, error: "No file provided" };
    }

    console.log("📂 File selected:", file);

    // 1️⃣ Upload file to Supabase Storage
    const filePath = `invoices/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // 2️⃣ Get public URL
    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
      .from("invoices")
      .getPublicUrl(uploadData.path);

    if (publicUrlError) {
      console.error("❌ Error getting public URL:", publicUrlError);
      return { success: false, error: publicUrlError.message };
    }

    const fileUrl = publicUrlData.publicUrl;

    // 3️⃣ Parse CSV
    const csvText = await file.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    let rows = parsed.data;

    if (!rows || rows.length === 0) {
      console.warn("⚠️ CSV is empty or invalid.");
      return { success: false, error: "CSV is empty or invalid" };
    }

    // 4️⃣ Normalize headers for each row
    rows = rows.map(row => {
      const normalizedRow = {};
      for (let key in row) {
        normalizedRow[normalizeHeader(key)] = row[key];
      }
      return normalizedRow;
    });

    // 5️⃣ Map CSV rows to Supabase table format + validation
    const invoiceRows = rows.map((row, i) => {
      const loadNumber = getCsvValue(row, csvMap.load_number)?.trim();
      if (!loadNumber) {
        throw new Error(`Missing load_number in CSV at row ${i + 1}`);
      }

      const totalCharge = parseFloat(getCsvValue(row, csvMap.total_charge)) || 0;
      const carrierPay = parseFloat((totalCharge * 0.75).toFixed(2)); // default 75%
      const billDateRaw = getCsvValue(row, csvMap.bill_date);
      const billDate = billDateRaw ? new Date(billDateRaw) : null;
      const shipperTerms = 30; // Net 30
      const carrierTerms = 15; // Net 15
      const today = new Date();

      const shipperDue = billDate ? new Date(billDate.getTime() + shipperTerms * 24*60*60*1000) : null;
      const carrierDue = billDate ? new Date(billDate.getTime() + carrierTerms * 24*60*60*1000) : null;

      // Auto-flagging only if unpaid (initial CSV import, both are false)
      let flaggedReason = null;
      if (shipperDue && shipperDue < today) flaggedReason = "Past Due – Shipper";
      else if (carrierDue && carrierDue < today) flaggedReason = "Past Due – Carrier";

      return {
        load_number: loadNumber,
        bill_date: billDateRaw,
        shipper: getCsvValue(row, csvMap.shipper)?.trim(),
        total_charge: parseFloat(totalCharge.toFixed(2)),
        shipper_terms: "Net 30",
        shipper_paid: false,
        carrier: getCsvValue(row, csvMap.carrier)?.trim(),
        carrier_pay: carrierPay,
        carrier_terms: "Net 15",
        carrier_paid: false,
        flagged_reason: flaggedReason,
        file_url: fileUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 6️⃣ Insert rows into Supabase
    const { error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceRows);

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("✅ All rows inserted successfully!");
    return { success: true, fileUrl };
  } catch (err) {
    console.error("🔥 Upload failed:", err.message);
    return { success: false, error: err.message };
  }
}
