// src/Components/UploadCSV.jsx
import React, { useRef, useState } from "react";
import { uploadInvoiceFile } from "../features/uploadInvoiceFile";
import "../Pages/Dashboard.css"; 

export default function UploadCSV({ onUpload, brokerEmail }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus("Uploading...");
    const result = await uploadInvoiceFile(file, brokerEmail);

    if (result.success) {
      setStatus("✅ Uploaded successfully!");
      if (onUpload) onUpload(file);
    } else {
      setStatus(`❌ Upload failed: ${result.error}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="quick-actions horizontal">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".csv"
      />
      <button className="qa-btn" onClick={() => fileInputRef.current?.click()}>
        Upload CSV
      </button>
      {status && <div className="upload-status">{status}</div>}
    </div>
  );
}
