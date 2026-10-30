import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PaymentSubmissionRequest } from "@/types/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PaymentSubmissionRequest;
    const { userId, projectId, gateway, planType, amountBdt, senderPhone, trxId } = body;

    if (!gateway || !["bkash", "nagad", "manual", "promo"].includes(gateway)) {
      return NextResponse.json({ error: "Invalid payment gateway." }, { status: 400 });
    }

    if (!planType || !["single_video", "creator_pack", "promo"].includes(planType)) {
      return NextResponse.json({ error: "Invalid pricing plan." }, { status: 400 });
    }

    if (!senderPhone || senderPhone.trim().length < 6) {
      return NextResponse.json({ error: "Please provide a valid sender phone number." }, { status: 400 });
    }

    if (!trxId || trxId.trim().length < 4) {
      return NextResponse.json({ error: "Please enter your Transaction ID (TrxID)." }, { status: 400 });
    }

    const cleanTrxId = trxId.trim().toUpperCase();

    // If Supabase is connected, record transaction in payments table
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("payments")
          .insert({
            user_id: userId || null,
            project_id: projectId || null,
            gateway,
            plan_type: planType,
            amount_bdt: amountBdt || (planType === "single_video" ? 120 : 499),
            sender_phone: senderPhone.trim(),
            trx_id: cleanTrxId,
            status: "pending",
            admin_notes: `Direct submission via ${gateway.toUpperCase()} (${senderPhone.trim()})`,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return NextResponse.json(
              { error: "This TrxID has already been submitted. Please check or contact support." },
              { status: 409 }
            );
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          paymentId: data?.id || "pay_" + Date.now().toString(36),
          status: "pending",
          message: "TrxID submitted successfully! Verification takes 2-5 minutes.",
        });
      }
    }

    // Local / Dev fallback response
    return NextResponse.json({
      success: true,
      paymentId: "pay_local_" + Date.now().toString(36),
      status: "pending",
      trxId: cleanTrxId,
      message: "TrxID submitted! (Dev/Local mode: auto-verify via Admin dashboard or Dev button).",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to process payment." },
      { status: 500 }
    );
  }
}
