import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase URL or Anon Key is missing. Check your .env.local or Vercel env."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ keeps session in localStorage
    autoRefreshToken: true,      // ✅ refresh expired tokens automatically
    detectSessionInUrl: true,    // ✅ ensures magic link sessions get saved
  },
});
