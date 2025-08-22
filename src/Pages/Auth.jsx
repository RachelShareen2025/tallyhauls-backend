import React, { useState } from "react";
import { signInWithMagicLink } from "../auth"; // keep your path

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      {/* Centered card */}
      <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-blue-600 text-center mb-6">TallyHauls</h1>
        <h2 className="text-xl font-medium text-gray-700 text-center mb-6">
          Login or Sign Up
        </h2>

        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {msg && (
          <p className="mt-4 text-center text-gray-600 text-sm break-words">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
