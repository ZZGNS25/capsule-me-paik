import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CAPSULE_BUCKET = "capsules";

let supabase: SupabaseClient | undefined;

export function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }

  return supabase;
}
