import React from "react";
import "./Landing.css";

export default function TermsOfService() {
  return (
    <div className="landing-container" style={{ padding: "80px 60px" }}>
      <h1>Terms of Service – TallyHauls</h1>
      <p><strong>Effective Date:</strong> [Insert Date]</p>

      <h2>Introduction</h2>
      <p>By using TallyHauls, you agree to these Terms of Service. These terms govern your access to and use of our cash-forecasting SaaS platform.</p>

      <h2>Eligibility</h2>
      <p>You must be 18+ and represent a legitimate business entity.</p>

      <h2>Subscription & Payment</h2>
      <ul>
        <li>TallyHauls is $199/month after a 10-day free trial.</li>
        <li>Payments are processed automatically via Paddle.</li>
        <li>Non-payment may result in account suspension.</li>
      </ul>

      <h2>Free Trial Terms</h2>
      <ul>
        <li>Trial lasts 10 days.</li>
        <li>No credit card is charged during trial.</li>
        <li>Trial ends automatically; subscription begins if not canceled.</li>
      </ul>

      <h2>User Responsibilities</h2>
      <ul>
        <li>Provide accurate business information.</li>
        <li>Keep your login credentials secure.</li>
        <li>Do not reverse-engineer, modify, or misuse the software.</li>
      </ul>

      <h2>Service Limitations / No Guarantees</h2>
      <p>TallyHauls provides cash flow projections based on uploaded invoices. All financial decisions are your responsibility. We do not guarantee uninterrupted service; maintenance or updates may occur.</p>

      <h2>Account Termination</h2>
      <ul>
        <li>Accounts may be terminated for ToS violations or non-payment.</li>
        <li>Users may cancel anytime; cancellation stops future billing.</li>
      </ul>

      <h2>Intellectual Property</h2>
      <ul>
        <li>TallyHauls owns all software, logos, and content.</li>
        <li>You receive a limited, non-transferable license to use the service.</li>
      </ul>

      <h2>Liability & Disclaimers</h2>
      <p>Maximum liability capped at subscription fees for the last 3 months or the minimum allowed by law. TallyHauls is not liable for indirect, incidental, or consequential damages.</p>

      <h2>Governing Law</h2>
      <p>These terms are governed by applicable law.</p>

      <h2>Changes to Terms</h2>
      <p>We may update the Terms of Service. Users will be notified of major changes.</p>

      <h2>Contact</h2>
      <p>For questions: <a href="mailto:hello@tallyhauls.com">hello@tallyhauls.com</a></p>
    </div>
  );
}
