import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { publishableKey, url } = requireSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
