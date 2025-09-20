import React, { useState, useEffect } from "react";
import "./Landing.css";
import { supabase } from "../supabaseClient";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ On load: check if user already has a session
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.location.href = "/frontend"; // FIX: redirect to valid route
      }
    };

    checkSession();

    // ✅ Also listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          window.location.href = "/frontend"; // FIX: redirect to valid route
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
          emailRedirectTo: "https://tallyhauls.com/",
        },
      });

      if (error) {
        console.error("Supabase magic link error:", error.message);
        setMsg("❌ Failed to send magic link. Try again.");
      } else {
        setMsg("✅ Magic link sent! Check your email.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setMsg("❌ Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
      {/* Header */}
      <header className="landing-header">
        <img src="/logo.png" alt="TallyHauls Logo" className="landing-logo" />
        <nav className="landing-nav">
          <a href="#features">Features</a>
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
          <img src="/Dashboard preview.png" alt="Dashboard preview" />
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
      </footer>
    </div>
  );
}
