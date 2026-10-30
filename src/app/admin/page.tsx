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
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { formatBdt } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/authStore";
import type { PlatformPaymentSettings } from "@/lib/settings";

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
  const [adminToken, setAdminToken] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalRevenueBdt: 0,
    pendingCount: 0,
    activeProjectsCount: 0,
    usersCount: 0,
  });
  const [activeTab, setActiveTab] = useState<"payments" | "settings" | "promo">("payments");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Payment Settings State
  const [settingsForm, setSettingsForm] = useState<PlatformPaymentSettings>({
    bkashNumber: "01712-345678",
    bkashType: "Personal",
    nagadNumber: "01912-345678",
    nagadType: "Personal",
    singlePriceBdt: 120,
    creatorPackPriceBdt: 499,
    helplineNumber: "+8801700000000",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Promo code form state
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoCredits, setNewPromoCredits] = useState(1);
  const [promoCodesList, setPromoCodesList] = useState<
    Array<{ code: string; credits: number; maxUses: number; usedCount: number }>
  >([
    { code: "LAUNCH2026", credits: 1, maxUses: 500, usedCount: 42 },
    { code: "CREATORVIP", credits: 5, maxUses: 50, usedCount: 11 },
  ]);

  // Check saved session token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = sessionStorage.getItem("waveframe_admin_token");
      if (savedToken) {
        setAdminToken(savedToken);
      }
    }
  }, []);

  const isAuthenticated = Boolean(adminToken);

  const fetchAdminData = async (token = adminToken) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${filterStatus}`, {
        headers: { "x-admin-key": token },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        if (data.stats) setStats(data.stats);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async (token = adminToken) => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-key": token },
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsForm(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData(adminToken);
      fetchSettings(adminToken);
    }
  }, [adminToken, filterStatus]);

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) return;
    setIsVerifying(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-admin-key": secretInput.trim() },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid Admin Secret Key.");
      }

      const validToken = secretInput.trim();
      sessionStorage.setItem("waveframe_admin_token", validToken);
      setAdminToken(validToken);
      setSecretInput("");
    } catch (err: unknown) {
      setAuthError((err as Error)?.message || "Authentication failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("waveframe_admin_token");
    setAdminToken("");
    setPayments([]);
  };

  const handlePaymentAction = async (paymentId: string, action: "approve" | "reject") => {
    setActionLoadingId(paymentId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminToken,
        },
        body: JSON.stringify({ paymentId, action }),
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p))
        );
        fetchAdminData();
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminToken,
        },
        body: JSON.stringify(settingsForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setSettingsMsg({ text: "Wallet numbers and pricing updated across Waveframe Studio!", error: false });
    } catch (err: unknown) {
      setSettingsMsg({ text: (err as Error)?.message || "Update failed", error: true });
    } finally {
      setSavingSettings(false);
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

  // If not authenticated, show Production Security Gate
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-400/30">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Founder's Control Center</h1>
            <p className="mt-1 text-xs text-slate-400">
              Restricted management area. Enter your verified <code className="text-indigo-300">ADMIN_SECRET_KEY</code> to access.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleSecretSubmit} className="space-y-3">
            <input
              type="password"
              required
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="Enter ADMIN_SECRET_KEY"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Secret & Enter Admin"}
            </button>
          </form>

          <div>
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
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
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              AUTHENTICATED
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchAdminData();
              fetchSettings();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            title="Refresh payments and settings"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Studio
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
            title="Lock and sign out of admin"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock</span>
          </button>
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
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
              activeTab === "settings"
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Dynamic Wallet &amp; Pricing Settings
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
                Approving automatically unlocks the video project or credits the user account.
              </div>
            </div>

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

        {/* Tab 2: Dynamic Wallet & Pricing Settings */}
        {activeTab === "settings" && (
          <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-white">Dynamic bKash &amp; Nagad Wallet Settings</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Update your live recipient phone numbers, payment collection mode, and pricing without redeploying code.
              </p>
            </div>

            {settingsMsg && (
              <div
                className={cn(
                  "rounded-xl border p-3 text-xs flex items-center gap-2",
                  settingsMsg.error
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                )}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{settingsMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* bKash Config */}
              <div className="rounded-xl border border-[#E2136E]/20 bg-[#E2136E]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <PaymentBadge provider="bkash" />
                  <span className="text-[11px] font-mono text-[#E2136E] font-medium">bKash Gateway</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">Recipient Phone Number</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.bkashNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bkashNumber: e.target.value })}
                      placeholder="017XXXXXXXX"
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#E2136E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">Payment Type</label>
                    <select
                      value={settingsForm.bkashType}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, bkashType: e.target.value as "Personal" | "Merchant" })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-[#E2136E]"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Make Payment)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nagad Config */}
              <div className="rounded-xl border border-[#F6921E]/20 bg-[#F6921E]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <PaymentBadge provider="nagad" />
                  <span className="text-[11px] font-mono text-[#F6921E] font-medium">Nagad Gateway</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">Recipient Phone Number</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.nagadNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nagadNumber: e.target.value })}
                      placeholder="019XXXXXXXX"
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#F6921E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">Payment Type</label>
                    <select
                      value={settingsForm.nagadType}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, nagadType: e.target.value as "Personal" | "Merchant" })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-[#F6921E]"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Make Payment)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing in BDT & Founder Support */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="font-semibold text-xs text-slate-200">Video Plan Pricing &amp; WhatsApp Helpline</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400">
                      Single Video Pass Price (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={settingsForm.singlePriceBdt}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, singlePriceBdt: Number(e.target.value) || 120 })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400">
                      5-Video Creator Pack Price (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min={50}
                      value={settingsForm.creatorPackPriceBdt}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, creatorPackPriceBdt: Number(e.target.value) || 499 })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400">
                      Founder WhatsApp Helpline Number (E.164 with country code)
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.helplineNumber || ""}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, helplineNumber: e.target.value })
                      }
                      placeholder="+8801700000000"
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Shown on the pending payment screen so customers can tap to expedite manual verification.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:brightness-110 disabled:opacity-50 transition"
              >
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Platform Payment Settings
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Promo Code Generator */}
        {activeTab === "promo" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Issue Promo Voucher</h3>
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
