import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trxId = searchParams.get("trxId")?.trim();
    const projectId = searchParams.get("projectId")?.trim();

    if (!trxId && !projectId) {
      return NextResponse.json(
        { error: "Either trxId or projectId parameter is required." },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("payments").select("id, status, trx_id, project_id, plan_type");
        if (trxId) {
          query = query.ilike("trx_id", trxId);
        } else if (projectId) {
          query = query.eq("project_id", projectId);
        }

        const { data: payments, error } = await query.order("created_at", { ascending: false }).limit(1);

        if (!error && payments && payments.length > 0) {
          const payment = payments[0];
          const isApproved = payment.status === "approved";
          return NextResponse.json({
            success: true,
            status: payment.status,
            isApproved,
            isUnlocked: isApproved,
            planType: payment.plan_type,
            trxId: payment.trx_id,
          });
        }

        // If no payment record, also check the project's unlocked status directly
        if (projectId) {
          const { data: project } = await supabase
            .from("projects")
            .select("id, is_unlocked")
            .eq("id", projectId)
            .maybeSingle();

          if (project?.is_unlocked) {
            return NextResponse.json({
              success: true,
              status: "approved",
              isApproved: true,
              isUnlocked: true,
            });
          }
        }
      }
    }

    // Default fallback state if not yet verified
    return NextResponse.json({
      success: true,
      status: "pending",
      isApproved: false,
      isUnlocked: false,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to check payment status" },
      { status: 500 }
    );
  }
}
