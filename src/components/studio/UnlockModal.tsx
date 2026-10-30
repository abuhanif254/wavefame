"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import type { PaymentProvider, PricingPlanId } from "@/types/studio";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { PRICING_PLANS, formatBdt, getPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/authStore";
import { useStudioStore } from "@/store/useStudioStore";
import type { PlatformPaymentSettings } from "@/lib/settings";

type Tab = "checkout" | "promo";
type Step = "choose" | "submitting" | "pending_submitted" | "success";

const PROVIDERS: ReadonlyArray<{ id: PaymentProvider; name: string; active: string }> = [
  { id: "bkash", name: "bKash", active: "border-[#E2136E] bg-[#E2136E]/10 ring-1 ring-[#E2136E]/50" },
  { id: "nagad", name: "Nagad", active: "border-[#F6921E] bg-[#F6921E]/10 ring-1 ring-[#F6921E]/50" },
];

export function UnlockModal() {
  const isOpen = useStudioStore((s) => s.isUnlockModalOpen);
  const close = useStudioStore((s) => s.closeUnlockModal);
  const project = useStudioStore((s) => s.project);
  const toggleUnlocked = useStudioStore((s) => s.toggleUnlocked);
  const startRender = useStudioStore((s) => s.startRender);

  const user = useAuthStore((s) => s.user);
  const deductCredit = useAuthStore((s) => s.deductCredit);
  const addCredits = useAuthStore((s) => s.addCredits);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [activeTab, setActiveTab] = useState<Tab>("checkout");
  const [planId, setPlanId] = useState<PricingPlanId>("single");
  const [provider, setProvider] = useState<PaymentProvider>("bkash");
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isRedeemingPromo, setIsRedeemingPromo] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Dynamic Payment Settings from /admin
  const [paymentSettings, setPaymentSettings] = useState<PlatformPaymentSettings>({
    bkashNumber: "01712-345678",
    bkashType: "Personal",
    nagadNumber: "01912-345678",
    nagadType: "Personal",
    singlePriceBdt: 120,
    creatorPackPriceBdt: 499,
    helplineNumber: "+8801700000000",
  });

  const plan = getPlan(planId);
  const activeNumber = provider === "bkash" ? paymentSettings.bkashNumber : paymentSettings.nagadNumber;
  const activeType = provider === "bkash" ? paymentSettings.bkashType : paymentSettings.nagadType;

  // Poll payment approval status every 5 seconds while in pending_submitted stage
  useEffect(() => {
    if (step !== "pending_submitted" || !isOpen) return;

    let isMounted = true;
    const pollPaymentStatus = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (trxId.trim()) queryParams.set("trxId", trxId.trim());
        if (project.id) queryParams.set("projectId", project.id);

        const res = await fetch(`/api/payments/status?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isUnlocked || data.status === "approved") {
            if (!project.isUnlocked) {
              toggleUnlocked();
            }
            if (refreshProfile) {
              await refreshProfile();
            }
            if (isMounted) {
              setStep("success");
            }
          }
        }
      } catch {
        // Silently retry next poll tick
      }
    };

    pollPaymentStatus();
    const interval = setInterval(pollPaymentStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, isOpen, trxId, project.id, project.isUnlocked, toggleUnlocked, refreshProfile]);

  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setErrorMsg("");
      setPromoMessage(null);

      // Fetch dynamic active recipient numbers from /api/settings
      fetch("/api/settings")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.bkashNumber) {
            setPaymentSettings(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Instant Wallet Credit Unlock
  const handleCreditUnlock = async () => {
    if (!user) {
      close();
      openAuthModal();
      return;
    }

    if (user.credits < 1) {
      setErrorMsg("Insufficient credits. Please top up below or pay with bKash/Nagad.");
      return;
    }

    const success = await deductCredit(1);
    if (success) {
      if (!project.isUnlocked) {
        toggleUnlocked();
      }
      startRender();
      setStep("success");
    } else {
      setErrorMsg("Failed to deduct credit. Please try again.");
    }
  };

  // 2. Direct TrxID Submission for bKash & Nagad
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!senderPhone || senderPhone.trim().length < 6) {
      setErrorMsg("Please enter your sender phone number.");
      return;
    }

    if (!trxId || trxId.trim().length < 4) {
      setErrorMsg("Please enter the Transaction ID (TrxID) from your SMS.");
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
          projectId: project.id,
          gateway: provider,
          planType: planId === "single" ? "single_video" : "creator_pack",
          amountBdt: plan.priceBdt,
          senderPhone: senderPhone.trim(),
          trxId: trxId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment submission failed.");
      }

      setStep("pending_submitted");
    } catch (err: unknown) {
      setStep("choose");
      setErrorMsg((err as Error)?.message || "Failed to submit payment.");
    }
  };

  // 3. Promo Code Redemption
  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    setIsRedeemingPromo(true);
    setPromoMessage(null);

    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem code.");
      }

      await addCredits(data.creditsAdded || 1);
      setPromoMessage({ text: data.message || `Granted +${data.creditsAdded} credits!`, error: false });
      setPromoCodeInput("");
    } catch (err: unknown) {
      setPromoMessage({ text: (err as Error)?.message || "Invalid or expired promotional code.", error: true });
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== "submitting") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unlock Full Video"
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-indigo-950/70 animate-modal-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/15 to-transparent" />

        {step !== "submitting" && (
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header */}
        <div className="relative border-b border-slate-800 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Unlock 1080p Master Video</h2>
                <p className="text-xs text-slate-400">
                  Strip watermark, unlock all 20 minutes, and export full resolution.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab("checkout")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                activeTab === "checkout"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Credit &amp; bKash/Nagad Checkout
            </button>
            <button
              onClick={() => setActiveTab("promo")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                activeTab === "promo"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Ticket className="h-3.5 w-3.5" />
              Promo Code
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Checkout */}
        {activeTab === "checkout" && (
          <div className="relative p-6 space-y-6">
            {step === "choose" && (
              <>
                {/* 1. Wallet Balance & Instant Credit Unlock */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/20 text-indigo-300">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-indigo-200">Video Credit Wallet</div>
                        <div className="text-sm font-bold text-white">
                          Balance: {user ? `${user.credits} Credit${user.credits !== 1 ? "s" : ""}` : "Not logged in"}
                        </div>
                      </div>
                    </div>

                    {user && user.credits > 0 ? (
                      <button
                        onClick={handleCreditUnlock}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:brightness-110 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Unlock Now (-1 Credit)
                      </button>
                    ) : !user ? (
                      <button
                        onClick={() => {
                          close();
                          openAuthModal();
                        }}
                        className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
                      >
                        Sign in to use credits
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">0 Credits</span>
                    )}
                  </div>
                </div>

                {/* 2. Pricing Plans Selector */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Choose Your Plan
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                    {PRICING_PLANS.map((p) => {
                      const selected = p.id === planId;
                      return (
                        <button
                          key={p.id}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setPlanId(p.id)}
                          className={cn(
                            "relative rounded-xl border p-4 text-left transition",
                            selected
                              ? "border-indigo-400/80 bg-indigo-500/10 ring-1 ring-indigo-400/50"
                              : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                          )}
                        >
                          {p.highlighted && (
                            <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              Best value · Save ৳101
                            </span>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                            <span
                              className={cn(
                                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                                selected ? "border-indigo-400 bg-indigo-500" : "border-slate-600"
                              )}
                            >
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </span>
                          </div>
                          <div className="mt-2 text-2xl font-black text-white">
                            {formatBdt(p.priceBdt)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {p.videos === 1 ? "1 video pass" : `${p.videos} videos (৳99 / video)`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. bKash / Nagad Gateway Selector */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pay with Bangladeshi Mobile Wallet
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3 transition",
                          provider === p.id ? p.active : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                        )}
                      >
                        <PaymentBadge provider={p.id} />
                        <span className="text-xs font-mono text-slate-400">
                          {p.id === "bkash" ? paymentSettings.bkashType : paymentSettings.nagadType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Payment Instructions Box with Dynamic Number & Type */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5 text-xs">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>
                      {provider.toUpperCase()} ({activeType}):
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400">Official Recipient</span>
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-4 text-slate-400">
                    <li>
                      Open your <strong className="text-white">{provider.toUpperCase()} app</strong> and tap{" "}
                      <strong className="text-white">
                        {activeType === "Merchant" ? "Payment / Make Payment" : "Send Money"}
                      </strong>
                      .
                    </li>
                    <li className="flex items-center gap-2">
                      <span>Recipient:</span>
                      <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white font-semibold">
                        {activeNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeNumber)}
                        className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                        title="Copy number"
                      >
                        {copiedNumber ? "Copied!" : <Copy className="h-3 w-3" />}
                      </button>
                    </li>
                    <li>
                      Amount: <strong className="text-white">{formatBdt(plan.priceBdt)}</strong> (Ref:{" "}
                      <code className="text-indigo-300">WF-{project.id.slice(0, 6)}</code>)
                    </li>
                    <li>Enter your sender phone number and the TrxID below to confirm.</li>
                  </ol>
                </div>

                {/* 5. TrxID Submission Form (No bypass buttons) */}
                <form onSubmit={handleSubmitPayment} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400">
                        Your Sender Phone Number
                      </label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400">
                        Transaction ID (TrxID)
                      </label>
                      <div className="relative mt-1">
                        <Ticket className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          placeholder="e.g. BL928XK4M1"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110 active:scale-[0.99]"
                  >
                    Submit {formatBdt(plan.priceBdt)} TrxID for Verification
                  </button>
                </form>
              </>
            )}

            {step === "submitting" && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Submitting Payment Record…</h3>
                <p className="text-xs text-slate-400">Connecting to secure payment validation API.</p>
              </div>
            )}

            {step === "pending_submitted" && (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">TrxID Submitted for Verification</h3>
                  <p className="mt-1 max-w-sm mx-auto text-xs text-slate-400">
                    We received your <strong className="text-white">{provider.toUpperCase()}</strong> transaction{" "}
                    <code className="text-indigo-300 font-mono font-semibold">{trxId.toUpperCase()}</code>.
                    Our team verifies and unlocks within 2-5 minutes!
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-amber-300 bg-amber-500/10 py-1.5 px-3 rounded-full w-fit mx-auto border border-amber-500/20">
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  Live polling approval status every 5s… Auto-unlocks when confirmed!
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 max-w-sm mx-auto">
                  <span>Reference ID: </span>
                  <code className="text-white">WF-{project.id.slice(0, 6)}</code>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {paymentSettings.helplineNumber && (
                    <a
                      href={`https://wa.me/${paymentSettings.helplineNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        `Hi Waveframe Support, I submitted ${provider.toUpperCase()} TrxID: ${trxId.trim()} for Project ${project.title || project.id}. Please expedite my 1080p master unlock!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition active:scale-[0.99]"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Helpline (Expedite)
                    </a>
                  )}

                  <button
                    onClick={close}
                    className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    Close &amp; Keep Working
                  </button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Project Unlocked in 1080p Master!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  All preview watermarks have been stripped. You can now export full-length videos up to 20 minutes.
                </p>
                <button
                  onClick={close}
                  className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Return to Studio
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Promo Code Flow (No public hints) */}
        {activeTab === "promo" && (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-indigo-300">
                <Gift className="h-4 w-4" />
                Redeem Promo / Partner Code
              </div>
              <p className="mt-1 text-slate-400">
                Enter your voucher or partner access code to claim video credits for your account.
              </p>
            </div>

            {promoMessage && (
              <div
                className={cn(
                  "rounded-xl border p-3 text-xs",
                  promoMessage.error
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                )}
              >
                {promoMessage.text}
              </div>
            )}

            <form onSubmit={handleRedeemPromo} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Promo Code</label>
                <input
                  type="text"
                  required
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Enter promo voucher (e.g. WF-PARTNER)"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-mono uppercase text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isRedeemingPromo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
              >
                {isRedeemingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Promo Code"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
