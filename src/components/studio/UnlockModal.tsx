"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import type { PaymentProvider, PricingPlanId } from "@/types/studio";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { PRICING_PLANS, formatBdt, getPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

type Step = "choose" | "processing" | "success";

const PROVIDERS: ReadonlyArray<{ id: PaymentProvider; name: string; active: string }> = [
  { id: "bkash", name: "bKash", active: "border-[#E2136E] bg-[#E2136E]/10 ring-1 ring-[#E2136E]/50" },
  { id: "nagad", name: "Nagad", active: "border-[#F6921E] bg-[#F6921E]/10 ring-1 ring-[#F6921E]/50" },
];

export function UnlockModal() {
  const isOpen = useStudioStore((s) => s.isUnlockModalOpen);
  const close = useStudioStore((s) => s.closeUnlockModal);
  const completePurchase = useStudioStore((s) => s.completePurchase);
  const videoCredits = useStudioStore((s) => s.videoCredits);

  const [planId, setPlanId] = useState<PricingPlanId>("single");
  const [provider, setProvider] = useState<PaymentProvider>("bkash");
  const [step, setStep] = useState<Step>("choose");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plan = getPlan(planId);
  const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? "";

  // Reset whenever the modal is reopened.
  useEffect(() => {
    if (isOpen) setStep("choose");
  }, [isOpen]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Escape closes, except mid-payment.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "processing") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, step, close]);

  if (!isOpen) return null;

  const pay = () => {
    setStep("processing");
    timer.current = setTimeout(() => {
      completePurchase(planId);
      setStep("success");
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== "processing") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unlock full video"
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-indigo-950/60 animate-modal-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/15 to-transparent" />

        {step !== "processing" && (
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {step === "choose" && (
          <div className="relative space-y-6 p-6">
            <header>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">Unlock your full video</h2>
              <p className="mt-1 text-sm text-slate-400">
                Render every scene in 1080p, remove the preview limit, and export.
              </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
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
                        ? "border-indigo-400/70 bg-indigo-500/10 ring-1 ring-indigo-400/40"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700",
                    )}
                  >
                    {p.highlighted && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Best value
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200">{p.name}</span>
                      <span
                        className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                          selected ? "border-indigo-400 bg-indigo-500" : "border-slate-600",
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {formatBdt(p.priceBdt)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.videos === 1
                        ? "one-time"
                        : `${p.videos} videos · ≈ ${formatBdt(Math.round(p.priceBdt / p.videos))}/video`}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {p.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-1.5 text-xs text-slate-400">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                Pay with
              </div>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={provider === p.id}
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 transition",
                      provider === p.id ? p.active : "border-slate-800 bg-slate-950/50 hover:border-slate-700",
                    )}
                  >
                    <PaymentBadge provider={p.id} />
                    <span className="text-xs text-slate-500">One-click</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={pay}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-400 hover:to-violet-500 active:scale-[0.99]"
              >
                Pay {formatBdt(plan.priceBdt)} with {providerName}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Simulated checkout. No real payment is processed.
              </p>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="relative flex flex-col items-center px-6 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <h2 className="mt-5 text-lg font-semibold text-white">Confirming with {providerName}…</h2>
            <p className="mt-1 text-sm text-slate-400">
              Approving {formatBdt(plan.priceBdt)}. Please don&apos;t close this window.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="relative flex flex-col items-center px-6 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-white">Full video unlocked</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Payment received via {providerName}. Your 1080p render has started.
              {videoCredits > 0 && ` You have ${videoCredits} more video credit${videoCredits > 1 ? "s" : ""} in your pack.`}
            </p>
            <button
              onClick={close}
              className="mt-6 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-slate-700"
            >
              Back to studio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
