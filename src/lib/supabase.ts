import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { HouseholdState } from "./types";

type Database = {
  public: {
    Tables: {
      household_state: {
        Row: { id: string; data: HouseholdState; updated_at: string };
        Insert: { id: string; data: HouseholdState; updated_at?: string };
        Update: { id?: string; data?: HouseholdState; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

/** Server-side Supabase client using the service role key. Never import from client components. */
export function supabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
