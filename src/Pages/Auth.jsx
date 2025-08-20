import React, { useState } from "react";
import { signInWithMagicLink } from "../auth"; // Correct relative path

export default function Auth() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const result = await signInWithMagicLink(email);

    if (result?.error) setMsg(result.error);
    else setMsg("Magic link sent! Check your email to login.");

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl mb-4">Login / Sign Up</h2>
      <form onSubmit={handleMagicLink}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 mb-3 border"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded w-full"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
