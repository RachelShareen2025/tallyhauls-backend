import React from "react";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/image/1.png" alt="TallyHauls Logo" className="dashboard-logo" />
        <h1>Dashboard</h1>
      </header>
      <main className="dashboard-main">
        <p>Welcome! Your TallyHauls dashboard will appear here once data is available.</p>
        {/* You can later add tables, graphs, charts here */}
      </main>
    </div>
  );
}
