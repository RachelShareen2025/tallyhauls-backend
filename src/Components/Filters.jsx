// src/Components/Filters.jsx
import React from "react";
import "../Pages/Dashboard.css"; // reuse styles

export default function Filters({ searchQuery, onSearchChange, paidFilters, onPaidFilterChange }) {
  return (
    <div className="quick-actions horizontal">
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search invoices..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Optional Paid Filters */}
      {paidFilters && (
        <div className="paid-filters">
          <label>
            <input
              type="checkbox"
              checked={paidFilters.shipperPaid}
              onChange={(e) =>
                onPaidFilterChange({ ...paidFilters, shipperPaid: e.target.checked })
              }
            />
            Shipper Paid
          </label>
          <label>
            <input
              type="checkbox"
              checked={paidFilters.carrierPaid}
              onChange={(e) =>
                onPaidFilterChange({ ...paidFilters, carrierPaid: e.target.checked })
              }
            />
            Carrier Paid
          </label>
        </div>
      )}
    </div>
  );
}
