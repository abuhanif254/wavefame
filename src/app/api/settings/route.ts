import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_PAYMENT_SETTINGS,
  getCachedSettings,
  setCachedSettings,
} from "@/lib/settings";

export async function GET() {
  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "payment_settings")
          .maybeSingle();

        if (data?.value && !error) {
          const merged = { ...DEFAULT_PAYMENT_SETTINGS, ...data.value };
          setCachedSettings(merged);
          return NextResponse.json(merged);
        }
      }
    }

    return NextResponse.json(getCachedSettings());
  } catch {
    return NextResponse.json(getCachedSettings());
  }
}
