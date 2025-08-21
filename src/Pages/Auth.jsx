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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Login / Sign Up</h2>
        <form onSubmit={handleMagicLink}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-center text-gray-700">{msg}</p>}
      </div>
    </div>
  );
}
