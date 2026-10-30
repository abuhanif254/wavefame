import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { verifyAdminRequest } from "@/lib/auth/adminGuard";

export async function GET(req: Request) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase
          .from("payments")
          .select("*, profiles(email, full_name), projects(title, is_unlocked)")
          .order("created_at", { ascending: false });

        if (statusFilter && statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        const { data: payments, error } = await query;
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Aggregate revenue
        const { data: approvedPayments } = await supabase
          .from("payments")
          .select("amount_bdt")
          .eq("status", "approved");

        const totalRevenueBdt = (approvedPayments || []).reduce(
          (acc, p) => acc + Number(p.amount_bdt || 0),
          0
        );

        // Count pending
        const { count: pendingCount } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Count active projects (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: activeProjectsCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twentyFourHoursAgo);

        // Count profiles
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        return NextResponse.json({
          payments: payments || [],
          stats: {
            totalRevenueBdt,
            pendingCount: pendingCount || 0,
            activeProjectsCount: activeProjectsCount || 0,
            usersCount: usersCount || 0,
          },
        });
      }
    }

    // Dev / Local Mock Data fallback
    const mockPayments = [
      {
        id: "pay_mock_1",
        gateway: "bkash",
        plan_type: "creator_pack",
        amount_bdt: 499,
        sender_phone: "01712-998877",
        trx_id: "BL928XK4M1",
        status: "pending",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        profiles: { email: "tanvir.studio@gmail.com", full_name: "Tanvir Rahman" },
        projects: { title: "AI Explainers Masterclass 2026", is_unlocked: false },
      },
      {
        id: "pay_mock_2",
        gateway: "nagad",
        plan_type: "single_video",
        amount_bdt: 120,
        sender_phone: "01823-456789",
        trx_id: "NG782019AA",
        status: "pending",
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        profiles: { email: "aisha.content@yahoo.com", full_name: "Aisha Content" },
        projects: { title: "E-Commerce Strategy Breakdown", is_unlocked: false },
      },
      {
        id: "pay_mock_3",
        gateway: "bkash",
        plan_type: "single_video",
        amount_bdt: 120,
        sender_phone: "01999-123456",
        trx_id: "BK482910CC",
        status: "approved",
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        profiles: { email: "sabbir@agency.bd", full_name: "Sabbir Ahmed" },
        projects: { title: "SaaS Onboarding Demo", is_unlocked: true },
      },
    ];

    return NextResponse.json({
      payments:
        statusFilter && statusFilter !== "all"
          ? mockPayments.filter((p) => p.status === statusFilter)
          : mockPayments,
      stats: {
        totalRevenueBdt: 739,
        pendingCount: 2,
        activeProjectsCount: 14,
        usersCount: 28,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to fetch admin data." },
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
    const { paymentId, action, notes } = await req.json();

    if (!paymentId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action parameters." }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (action === "approve") {
          const { data, error } = await supabase.rpc("approve_payment", {
            p_payment_id: paymentId,
            p_notes: notes || "Approved via Founder Admin Portal",
          });
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          return NextResponse.json({ success: true, data });
        } else {
          const { error } = await supabase
            .from("payments")
            .update({ status: "rejected", admin_notes: notes || "Rejected by admin", updated_at: new Date().toISOString() })
            .eq("id", paymentId);
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          return NextResponse.json({ success: true, status: "rejected" });
        }
      }
    }

    // Local / Dev fallback response
    return NextResponse.json({
      success: true,
      paymentId,
      status: action === "approve" ? "approved" : "rejected",
      message: `Payment ${action === "approve" ? "approved & unlocked" : "rejected"} in dev mode.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Action failed." },
      { status: 500 }
    );
  }
}
