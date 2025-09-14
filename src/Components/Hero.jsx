import React from "react";
import "./Landing.css";

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">Automate Your Freight Finances</h1>
        <p className="hero-subtitle">
          TallyHauls helps freight brokers reconcile invoices, track payments, and simplify accounting — all in one dashboard.
        </p>

        <form className="hero-cta-form">
          <input
            type="email"
            placeholder="Enter your email"
            className="hero-input"
            required
          />
          <button type="submit" className="hero-cta-btn">
            Get Started
          </button>
        </form>
      </div>

      <div className="hero-image">
        <img src="/image/dashboard.png" alt="Dashboard preview" />
      </div>
    </section>
  );
}
