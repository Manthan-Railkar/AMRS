import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  // Prevent secret keys (service_role) from ever being sent to the browser
  if (anonKey.startsWith("sb_secret_")) {
    anonKey = "placeholder-anon-key";
  }

  return createBrowserClient(url, anonKey);
}
