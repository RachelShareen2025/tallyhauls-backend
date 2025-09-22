import React from "react";
import "./Landing.css";

export default function RefundPolicy() {
  return (
    <div className="landing-container" style={{ padding: "80px 60px" }}>
      <h1>Refund Policy – TallyHauls</h1>
      <p><strong>Effective Date:</strong> [09/22/2025]</p>

      <h2>Eligibility</h2>
      <ul>
        <li>10-day free trial: no charge, so no refund needed.</li>
        <li>Paid subscriptions: refunds only issued for technical errors such as system downtime, failed subscription activation, or duplicate charges.</li>
      </ul>

      <h2>Request Process</h2>
      <p>Email <a href="mailto:hello@tallyhauls.com">hello@tallyhauls.com</a> with your account info, invoice ID, and reason for the refund. Requests must be submitted within 7 days of the charge.</p>

      <h2>Processing Time</h2>
      <p>Refunds are processed within 5–7 business days via the original payment method.</p>

      <h2>Non-Refundable</h2>
      <ul>
        <li>Dissatisfaction with the product after the trial period.</li>
        <li>Partial-month refunds are not provided.</li>
      </ul>

      <h2>Billing Errors</h2>
      <p>Accidental duplicate charges will be refunded promptly.</p>

      <h2>Contact</h2>
      <p>For refund inquiries: <a href="mailto:hello@tallyhauls.com">hello@tallyhauls.com</a></p>
    </div>
  );
}
