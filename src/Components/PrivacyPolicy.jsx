import React from "react";
import "./Landing.css"; // Reuse existing styles

export default function PrivacyPolicy() {
  return (
    <div className="landing-container" style={{ padding: "80px 60px" }}>
      <h1>Privacy Policy – TallyHauls</h1>
      <p><strong>Effective Date:</strong> [09/22/2025]</p>

      <h2>Introduction</h2>
      <p>TallyHauls values your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our freight cash-forecasting SaaS platform.</p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, company name, phone (if provided) — fetched from FMCSA public data.</li>
        <li><strong>Payment Information:</strong> Processed via secure third-party service Paddle. We do not store full card numbers.</li>
        <li><strong>Usage Data:</strong> Dashboard interactions, CSV uploads, login timestamps, and other technical information to improve the service.</li>
      </ul>

      <h2>How We Use Information</h2>
      <ul>
        <li>Provide and improve TallyHauls features.</li>
        <li>Communicate updates, billing notices, and optional promotions.</li>
        <li>Prevent fraud and ensure security.</li>
      </ul>

      <h2>Cookies & Tracking</h2>
      <p>We may use cookies and analytics tools to understand user behavior and improve performance. You can disable cookies in your browser, but some features may not work fully.</p>

      <h2>Data Sharing & Third Parties</h2>
      <ul>
        <li>We do not sell or rent your data.</li>
        <li>Data may be shared with service providers for hosting, payment processing, or legal compliance.</li>
      </ul>

      <h2>Data Retention</h2>
      <p>We retain account data as long as your account is active. Inactive accounts may be deleted after one month of inactivity.</p>

      <h2>User Rights</h2>
      <ul>
        <li>Access, correct, or request deletion of your personal data.</li>
        <li>Opt-out of promotional emails at any time.</li>
      </ul>

      <h2>Security Measures</h2>
      <ul>
        <li>All data is transmitted via HTTPS.</li>
        <li>Data is stored securely on cloud servers with encryption and access controls.</li>
      </ul>

      <h2>Contact</h2>
      <p>For privacy concerns: <a href="mailto:hello@tallyhauls.com">hello@tallyhauls.com</a></p>
    </div>
  );
}
