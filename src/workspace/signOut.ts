import { supabase } from "@/lib/supabase-ssr";

/**
 * Sign out of this device only. A global sign-out returns 403 when the server session is
 * already gone, and supabase-js then keeps the local session — stranding the user signed in.
 */
export const signOut = async () => {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // A revoked or expired server session must not strand the user signed in.
  }
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("sb-")).forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
  // Reload so the provider re-reads an empty session and the login screen shows.
  window.location.assign("/workspace");
};
