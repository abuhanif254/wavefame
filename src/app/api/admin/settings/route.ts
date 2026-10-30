import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { verifyAdminRequest } from "@/lib/auth/adminGuard";
import {
  DEFAULT_PAYMENT_SETTINGS,
  setCachedSettings,
  type PlatformPaymentSettings,
} from "@/lib/settings";

export async function GET(req: Request) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "payment_settings")
          .maybeSingle();

        if (data?.value) {
          return NextResponse.json(data.value);
        }
      }
    }

    return NextResponse.json(DEFAULT_PAYMENT_SETTINGS);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to load settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<PlatformPaymentSettings>;

    const updatedSettings: PlatformPaymentSettings = {
      bkashNumber: body.bkashNumber?.trim() || DEFAULT_PAYMENT_SETTINGS.bkashNumber,
      bkashType: body.bkashType === "Merchant" ? "Merchant" : "Personal",
      nagadNumber: body.nagadNumber?.trim() || DEFAULT_PAYMENT_SETTINGS.nagadNumber,
      nagadType: body.nagadType === "Merchant" ? "Merchant" : "Personal",
      singlePriceBdt: Number(body.singlePriceBdt) || 120,
      creatorPackPriceBdt: Number(body.creatorPackPriceBdt) || 499,
      helplineNumber: body.helplineNumber?.trim() || DEFAULT_PAYMENT_SETTINGS.helplineNumber,
    };

    setCachedSettings(updatedSettings);

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from("platform_settings").upsert({
          key: "payment_settings",
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Platform payment settings updated successfully.",
      settings: updatedSettings,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
