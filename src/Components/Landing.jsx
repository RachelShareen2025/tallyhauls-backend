import React, { useState, useEffect } from "react";
import "./Landing.css";
import { supabase } from "../supabaseClient";
import dashboardImg from "./assets/Dashboard preview.png";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.location.href = "/Dashboard";
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          window.location.href = "/Dashboard";
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setMsg("Please enter a valid email.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/Dashboard`,
        },
      });

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Supabase magic link error:", error.message);
        }
        setMsg("❌ Failed to send magic link. Try again or contact support.");
      } else {
        setMsg("✅ Magic link sent! Check your email (and spam folder).");
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Unexpected error:", err);
      }
      setMsg("❌ Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const content = {
    hero: {
      heading: "Forecast Your Freight Cash Flow — Before It Hits Your Bank",
      subheading:
        "TallyHauls shows U.S. freight brokers exactly when money will arrive and when bills are due — so you never get blindsided by a cash crunch.",
      cta: "Start Your 10-Day Free Trial",
    },
    features: [
      {
        title: "Project Cash 30 / 60 / 90 Days",
        description:
          "Upload invoices and instantly see a cash timeline: expected inflows, carrier payouts, and net position so you can plan moves before the gap becomes a crisis.",
      },
      {
        title: "Spot Cash At Risk — Fast",
        description:
          "Automatically flag slow-paying shippers, overdue carriers, and concentration risks so you can act early and protect margins.",
      },
      {
        title: "Leverage Working Capital (Without Factoring)",
        description:
          "Know exactly how much cash is collectible and when — use that clarity to negotiate better terms, take more loads, and avoid expensive advances.",
      },
    ],
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <img src="/logo.png" alt="TallyHauls Logo" className="landing-logo" />
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#roi">ROI</a>
          <a href="#contact">Contact</a>
          <a href="/auth" className="cta-btn">
            Get Started
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-left">
          <h1>{content.hero.heading}</h1>
          <p>{content.hero.subheading}</p>
          <form onSubmit={handleMagicLink} className="hero-login-form">
            <input
              type="email"
              placeholder="Enter your business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              aria-label="Business email"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Start 10-day free trial"
            >
              {loading ? "Sending..." : content.hero.cta}
            </button>
          </form>

          <p style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
            No credit card required for the 10-day free trial. By starting the trial you agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </p>

          {msg && (
            <p className="login-msg" role="status" style={{ marginTop: 12 }}>
              {msg}
            </p>
          )}
        </div>
        <div className="hero-right">
          {/* Replace this image with a cash-forecasting dashboard mock (same filename or update import) */}
          <img src={dashboardImg} alt="Cash forecasting dashboard preview" />
        </div>
      </section>

      {/* Features */}
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

      {/* ROI Callout */}
      <section className="roi-section" id="roi">
        <div className="roi-card">
          <h2>Forecasting ROI — The math that brokers actually care about</h2>
          <p className="roi-copy">
            Brokers commonly lose <strong>$2,000+</strong> per month to timing gaps, late fees, and missed opportunities.
            TallyHauls starts at <strong>$199/month</strong>. Catch one late payment or avoid one expensive cash advance and the tool has paid for itself.
          </p>
          <div style={{ marginTop: 18 }}>
            <a href="/auth" className="cta-btn" aria-label="Start free trial">
              Start 10-Day Free Trial
            </a>
          </div>
        </div>
      </section>

      {/* Trust / Security */}
      <section className="trust-section">
        <div className="trust-grid">
          <div className="trust-item">
            <h3>Secure & Broker-Friendly</h3>
            <p>U.S.-based broker data only. We never sell your data.</p>
          </div>
          <div className="trust-item">
            <h3>Payments via Paddle</h3>
            <p>Encrypted billing and proven compliance for brokers who scale.</p>
          </div>
          <div className="trust-item">
            <h3>Built for Brokers</h3>
            <p>Designed around real broker workflows: invoices, pickups, settlements, and cash timing.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
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
        <p className="legal-links">
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> |{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> |{" "}
          <a href="/refund" target="_blank" rel="noopener noreferrer">Refund Policy</a>
        </p>
      </footer>
    </div>
  );
}
