"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Film,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { formatBdt } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/authStore";

interface AdminPaymentItem {
  id: string;
  gateway: "bkash" | "nagad" | "manual" | "promo";
  plan_type: "single_video" | "creator_pack" | "promo";
  amount_bdt: number;
  sender_phone: string;
  trx_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  admin_notes?: string;
  profiles?: { email: string; full_name?: string };
  projects?: { title: string; is_unlocked: boolean };
}

interface AdminStats {
  totalRevenueBdt: number;
  pendingCount: number;
  activeProjectsCount: number;
  usersCount: number;
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const toggleDevAdminMode = useAuthStore((s) => s.toggleDevAdminMode);

  const [passcode, setPasscode] = useState("");
  const [isPasscodeAuthenticated, setIsPasscodeAuthenticated] = useState(false);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalRevenueBdt: 0,
    pendingCount: 0,
    activeProjectsCount: 0,
    usersCount: 0,
  });
  const [activeTab, setActiveTab] = useState<"payments" | "projects" | "promo">("payments");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Promo code form state
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoCredits, setNewPromoCredits] = useState(1);
  const [promoCodesList, setPromoCodesList] = useState<
    Array<{ code: string; credits: number; maxUses: number; usedCount: number }>
  >([
    { code: "LAUNCH2026", credits: 1, maxUses: 500, usedCount: 42 },
    { code: "CREATORVIP", credits: 5, maxUses: 50, usedCount: 11 },
    { code: "WAVE100", credits: 1, maxUses: 1000, usedCount: 88 },
  ]);

  const isAdmin = user?.is_admin || isPasscodeAuthenticated;

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${filterStatus}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin, filterStatus]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === "waveframe2026" || passcode === "admin") {
      setIsPasscodeAuthenticated(true);
      toggleDevAdminMode();
    } else {
      alert("Invalid admin passcode. Hint: waveframe2026");
    }
  };

  const handlePaymentAction = async (paymentId: string, action: "approve" | "reject") => {
    setActionLoadingId(paymentId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });

      if (res.ok) {
        // Update local list
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p))
        );
        // Refresh counts
        fetchAdminData();
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    const cleanCode = newPromoCode.trim().toUpperCase();
    setPromoCodesList((prev) => [
      { code: cleanCode, credits: Number(newPromoCredits) || 1, maxUses: 100, usedCount: 0 },
      ...prev,
    ]);
    setNewPromoCode("");
    alert(`Promo code ${cleanCode} generated!`);
  };

  // If not authenticated as Admin, show Security Gate
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-400/30">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Founder's Revenue &amp; Admin Center</h1>
            <p className="mt-1 text-xs text-slate-400">
              Restricted access. Enter your founder passphrase or enable developer admin access.
            </p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Admin passphrase (e.g. waveframe2026)"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition"
            >
              Authenticate &amp; Access Admin Portal
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsPasscodeAuthenticated(true);
                toggleDevAdminMode();
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              ⚡ Instant 1-Click Dev Admin Bypass
            </button>
          </div>

          <div>
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
            >
              <ArrowLeft className="h-3 w-3" />
              Return to Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/90 px-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur">
        <div className="flex items-center gap-4">
          <Logo href="/studio" />
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Founder's Control Center</span>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/30">
              LIVE REVENUE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            title="Refresh payments"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Open Studio
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* KPI Metrics Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Revenue (BDT)</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {formatBdt(stats.totalRevenueBdt)}
            </div>
            <div className="mt-1 text-[11px] text-emerald-400 font-medium">
              From approved bKash &amp; Nagad orders
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Pending Verifications</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 flex items-center gap-2">
              {stats.pendingCount}
              {stats.pendingCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="mt-1 text-[11px] text-amber-400/80 font-medium">
              Requires 1-click TrxID match
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active 24h Projects</span>
              <Layers className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.activeProjectsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Auto-expiry scheduled in 24 hours
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Registered Creators</span>
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {stats.usersCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Active video accounts
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("payments")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
              activeTab === "payments"
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pending &amp; Verified Payments ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab("promo")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
              activeTab === "promo"
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            <Ticket className="h-3.5 w-3.5" />
            Promo Code Generator
          </button>
        </div>

        {/* Tab 1: Payments & TrxID Verification */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Filter Status:</span>
                {["all", "pending", "approved", "rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs capitalize transition",
                      filterStatus === st
                        ? "bg-slate-800 text-white font-semibold ring-1 ring-slate-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500">
                Tip: Approving unlocks the project in 1080p and credits the user wallet automatically.
              </div>
            </div>

            {/* Payments Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Time / Date</th>
                      <th className="px-4 py-3">Creator / Phone</th>
                      <th className="px-4 py-3">Gateway</th>
                      <th className="px-4 py-3">Plan &amp; Amount</th>
                      <th className="px-4 py-3">Transaction ID (TrxID)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No payment submissions found matching filter.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const isActionBusy = actionLoadingId === p.id;
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-4 py-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                              {new Date(p.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              <div className="text-[10px] text-slate-500">
                                {new Date(p.created_at).toLocaleDateString()}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">
                                {p.profiles?.full_name || p.profiles?.email || "Anonymous Creator"}
                              </div>
                              <div className="font-mono text-slate-400 text-[11px]">
                                {p.sender_phone || "No phone given"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <PaymentBadge provider={p.gateway === "bkash" ? "bkash" : "nagad"} />
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-white">{formatBdt(p.amount_bdt)}</div>
                              <div className="text-[10px] text-slate-400 capitalize">
                                {p.plan_type.replace("_", " ")}
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono font-semibold text-indigo-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 w-fit">
                                <span>{p.trx_id}</span>
                                <button
                                  type="button"
                                  onClick={() => copyText(p.trx_id, p.id)}
                                  className="text-slate-400 hover:text-white"
                                  title="Copy TrxID"
                                >
                                  {copiedId === p.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                  p.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : p.status === "rejected"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                )}
                              >
                                {p.status === "approved" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : p.status === "rejected" ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3 animate-pulse" />
                                )}
                                {p.status}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {p.status === "pending" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handlePaymentAction(p.id, "approve")}
                                    disabled={isActionBusy}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
                                  >
                                    {isActionBusy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    Approve &amp; Unlock
                                  </button>
                                  <button
                                    onClick={() => handlePaymentAction(p.id, "reject")}
                                    disabled={isActionBusy}
                                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    <X className="h-3 w-3" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500">Processed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Promo Code Generator */}
        {activeTab === "promo" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Generate Promo Voucher</h3>
              </div>
              <p className="text-xs text-slate-400">
                Create partnership, promotion, or support compensation codes that grant free video credits.
              </p>

              <form onSubmit={handleCreatePromoCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400">Promo Code</label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="e.g. VIP2026 or BDCREATOR"
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400">
                    Video Credits to Grant
                  </label>
                  <select
                    value={newPromoCredits}
                    onChange={(e) => setNewPromoCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 Video Credit (৳120 value)</option>
                    <option value={5}>5 Video Credits (৳499 value)</option>
                    <option value={10}>10 Video Credits (৳999 value)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Issue Promo Code
                </button>
              </form>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-violet-400" />
                  <h3 className="font-semibold text-sm text-white">Active Promo Codes</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {promoCodesList.length} Active Vouchers
                </span>
              </div>

              <div className="divide-y divide-slate-800">
                {promoCodesList.map((pc) => (
                  <div key={pc.code} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-white text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {pc.code}
                        </code>
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          +{pc.credits} Credits
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Redeemed {pc.usedCount} / {pc.maxUses} times
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(pc.code, pc.code)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      {copiedId === pc.code ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
