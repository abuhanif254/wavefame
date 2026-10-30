import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DEV_PROMO_CODES: Record<string, number> = {
  LAUNCH2026: 1,
  CREATORVIP: 5,
  WAVE100: 1,
  FOUNDERPASS: 10,
};

export async function POST(req: Request) {
  try {
    const { code, userId } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please enter a promo code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Supabase RPC execution
    if (isSupabaseConfigured && userId) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.rpc("redeem_promo_code", {
          p_code: cleanCode,
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data?.success) {
          return NextResponse.json({ error: data?.error || "Invalid promo code." }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          creditsAdded: data.credits_added,
          code: cleanCode,
          message: `Promo code applied! Added +${data.credits_added} video credits to your wallet.`,
        });
      }
    }

    // Local / Dev fallback lookup
    const credits = DEV_PROMO_CODES[cleanCode];
    if (credits) {
      return NextResponse.json({
        success: true,
        creditsAdded: credits,
        code: cleanCode,
        message: `Promo code applied! Added +${credits} video credits to your wallet.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid promo code. Try 'LAUNCH2026' or 'CREATORVIP'." },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to redeem code." },
      { status: 500 }
    );
  }
}
