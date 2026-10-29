import Link from "next/link";
import { Check, Gift } from "lucide-react";
import { SectionHeading } from "@/components/landing/FeatureSections";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { PRICING_PLANS, formatBdt } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const FREE_PERKS = ["Upload a 1-minute clip", "Watch a 30-second high-retention preview", "Edit every scene in the studio"];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <SectionHeading eyebrow="Pricing" title="Ultra-low, local pricing. Pay only when you publish." />

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
        Checkout with <PaymentBadge provider="bkash" /> <PaymentBadge provider="nagad" />
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {/* Free trial */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Gift className="h-4 w-4 text-emerald-300" /> Free Trial
          </div>
          <div className="mt-4 text-4xl font-semibold tracking-tight text-white">৳0</div>
          <p className="mt-1 text-sm text-slate-500">1 minute of audio, on us</p>
          <PerkList perks={FREE_PERKS} />
          <PlanCta label="Start free trial" />
        </div>

        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6",
              plan.highlighted
                ? "border-indigo-400/50 bg-gradient-to-b from-indigo-500/15 to-slate-900/60 shadow-xl shadow-indigo-950/50"
                : "border-white/10 bg-slate-900/50",
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Best value
              </span>
            )}
            <div className="text-sm font-medium text-slate-300">{plan.name}</div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-white">{formatBdt(plan.priceBdt)}</span>
              <span className="text-sm text-slate-500">{plan.videos === 1 ? "/ video" : `/ ${plan.videos} videos`}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {plan.videos === 1
                ? plan.description
                : `≈ ${formatBdt(Math.round(plan.priceBdt / plan.videos))} per video. ${plan.description}`}
            </p>
            <PerkList perks={plan.perks} />
            <PlanCta label={plan.videos === 1 ? "Pay per video" : "Get the Creator Pack"} primary={plan.highlighted} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PerkList({ perks }: { perks: readonly string[] }) {
  return (
    <ul className="mt-6 flex-1 space-y-2.5">
      {perks.map((perk) => (
        <li key={perk} className="flex items-start gap-2 text-sm text-slate-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          {perk}
        </li>
      ))}
    </ul>
  );
}

function PlanCta({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <Link
      href="/studio"
      className={cn(
        "mt-8 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
        primary
          ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-400 hover:to-violet-500"
          : "text-white ring-1 ring-white/15 hover:bg-white/5",
      )}
    >
      {label}
    </Link>
  );
}
