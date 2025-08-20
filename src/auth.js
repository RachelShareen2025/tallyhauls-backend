// src/auth.js
import { supabase } from "./supabaseClient";

// Magic link login
export const signInWithMagicLink = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: process.env.REACT_APP_DASHBOARD_URL || "https://app.tallyhauls.com/dashboard",
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ MagicLink Error:", err.message);
    return { error: err.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ SignOut Error:", err.message);
    return { error: err.message };
  }
};

// Get current session
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (err) {
    console.error("❌ GetSession Error:", err.message);
    return null;
  }
};

// Get current user
export const getUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (err) {
    console.error("❌ GetUser Error:", err.message);
    return null;
  }
};
