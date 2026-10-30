"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
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

type Tab = "checkout" | "promo";
type Step = "choose" | "submitting" | "pending_submitted" | "success";

const WALLET_NUMBERS: Record<PaymentProvider, { number: string; type: string; color: string }> = {
  bkash: { number: "01712-345678", type: "Personal", color: "#E2136E" },
  nagad: { number: "01912-345678", type: "Personal", color: "#F6921E" },
};

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

  const plan = getPlan(planId);
  const providerInfo = WALLET_NUMBERS[provider];

  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setErrorMsg("");
      setPromoMessage(null);
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

  // 3. Dev Quick Unlock (for immediate verification in preview)
  const handleDevQuickUnlock = () => {
    if (!project.isUnlocked) {
      toggleUnlocked();
    }
    if (planId === "creator_pack") {
      addCredits(5);
    }
    startRender();
    setStep("success");
  };

  // 4. Promo Code Redemption
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

      // Add credits to user
      await addCredits(data.creditsAdded || 1);
      setPromoMessage({ text: data.message || `Granted +${data.creditsAdded} credits!`, error: false });
      setPromoCodeInput("");
    } catch (err: unknown) {
      setPromoMessage({ text: (err as Error)?.message || "Invalid promo code", error: true });
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

        {/* Tab 1: Checkout (Instant Credit + bKash/Nagad) */}
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
                        <span className="text-xs font-mono text-slate-400">Direct Send</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Payment Instructions Box */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5 text-xs">
                  <div className="font-semibold text-slate-200">
                    Payment Instructions ({provider.toUpperCase()} Send Money):
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-4 text-slate-400">
                    <li>
                      Open your <strong className="text-white">{provider.toUpperCase()} app</strong> and tap{" "}
                      <strong className="text-white">Send Money</strong>.
                    </li>
                    <li className="flex items-center gap-2">
                      <span>Send to:</span>
                      <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white font-semibold">
                        {providerInfo.number}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(providerInfo.number)}
                        className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
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

                {/* 5. TrxID Submission Form */}
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

                  {/* Dev mode immediate bypass */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleDevQuickUnlock}
                      className="text-[11px] text-slate-500 hover:text-slate-300 underline"
                      title="For instant developer testing without waiting for DB approval"
                    >
                      ⚡ Instant Dev Preview Unlock (Bypass TrxID)
                    </button>
                  </div>
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

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 max-w-sm mx-auto">
                  <span>Reference ID: </span>
                  <code className="text-white">WF-{project.id.slice(0, 6)}</code>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleDevQuickUnlock}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Simulate Admin Approval (Dev)
                  </button>
                  <button
                    onClick={close}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Close
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

        {/* Tab 2: Promo Code Flow */}
        {activeTab === "promo" && (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-indigo-300">
                <Gift className="h-4 w-4" />
                Redeem Promo / Partner Code
              </div>
              <p className="mt-1 text-slate-400">
                Enter your voucher or beta access code to instantly claim video credits for your account.
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
                  placeholder="e.g. LAUNCH2026 or CREATORVIP"
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

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Try demo codes: </span>
              <code className="text-indigo-400">LAUNCH2026</code> (+1 Credit),{" "}
              <code className="text-indigo-400">CREATORVIP</code> (+5 Credits)
            </div>
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
