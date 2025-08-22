import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase URL or Anon Key is missing. Check your .env.local or Vercel env."
  );
}

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
