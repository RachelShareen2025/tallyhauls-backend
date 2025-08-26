import React, { useState } from "react";
import "./Landing.css";
import { supabase } from "../supabaseClient"; // Make sure this path matches your setup

export default function Landing() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setMsg("Please enter a valid email.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: "https://tallyhauls.com/dashboard", // exact redirect URL
        },
      });

      if (error) {
        console.log("Supabase magic link error:", error.message);
        setMsg("Failed to send magic link. Check console for details.");
      } else {
        setMsg("Magic link sent! Check your email.");
      }
    } catch (err) {
      console.log("Unexpected error:", err);
      setMsg("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Centralized text content (easy edits later)
  const content = {
    hero: {
      heading: "Save 10+ Hours a Week on Freight Reconciliation",
      subheading:
        "TallyHauls automates invoices, payments, and settlements — eliminating errors and giving U.S. brokers back valuable time to grow their business",
      cta: "Start Your 10-Day Free Trial",
    },
    features: [
      {
        title: "Catch Errors Before They Drain Profits",
        description:
          "TallyHauls instantly matches invoices with loads and payments, eliminating manual checks and preventing costly mistakes. Brokers save 5–10 hours every week.",
      },
      {
        title: "Know Your Cash Flow in Seconds",
        description:
          "Track outstanding payments, carrier settlements, and real-time cash flow at a glance. Make smarter decisions without digging through spreadsheets.",
      },
      {
        title: "Stronger Carrier Relationships, Less Busywork",
        description:
          "Automate settlements across multiple payment methods. Avoid disputes, track everything in one place, and pay carriers on time — every time.",
      },
    ],
  };

  return (
    <div className="landing-container">
      {/* Header / Navbar */}
      <header className="landing-header">
        <img src="/image/1.png" alt="TallyHauls Logo" className="landing-logo" />
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
          <a href="/auth" className="cta-btn">Get Started</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-left">
          <h1>{content.hero.heading}</h1>
          <p>{content.hero.subheading}</p>
          <form onSubmit={handleMagicLink} className="hero-login-form">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : content.hero.cta}
            </button>
          </form>
          {msg && <p className="login-msg">{msg}</p>}
        </div>
        <div className="hero-right">
          <img src="/image/Dashboard.png" alt="Dashboard preview" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <h2>Features</h2>
        <div className="features-grid">
          {content.features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="contact">
        <h2>Contact Us</h2>
        <form className="contact-form" action="/auth">
          <input type="text" placeholder="Full Name" required />
          <input type="email" placeholder="Email Address" required />
          <textarea placeholder="How can we help you?" rows="4" required></textarea>
          <button type="submit">Get Started</button>
        </form>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2025 TallyHauls. All rights reserved.</p>
      </footer>
    </div>
  );
}
