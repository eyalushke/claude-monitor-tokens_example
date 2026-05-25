import { createClient } from "@supabase/supabase-js";

export const DB_SCHEMA = "claude_monitor";

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: DB_SCHEMA } }
  );
}
