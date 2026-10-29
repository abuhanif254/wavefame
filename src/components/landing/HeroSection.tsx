import Link from "next/link";
import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { SINGLE_PRICE_BDT, formatBdt } from "@/lib/pricing";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-16 sm:pt-24">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute right-[-10rem] top-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-200">
          <Gift className="h-3.5 w-3.5" />
          1-Minute Free Trial · No card needed
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Turn 20-Minute Audio into <span className="text-gradient">High-Retention Explainer Videos</span> in Minutes.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
          Upload your narration. Our hybrid visual engine cuts it into rapid 2-second scenes with AI panels, motion
          graphics, stock footage and kinetic text, then lets you edit every single cut.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/studio"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/20 transition hover:from-indigo-400 hover:to-violet-500 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            Try Studio Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-base font-medium text-slate-200 ring-1 ring-white/15 transition hover:bg-white/5 sm:w-auto"
          >
            See pricing
          </a>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-400 sm:flex-row">
          <span>
            Pay-per-video from <strong className="font-semibold text-white">{formatBdt(SINGLE_PRICE_BDT)}</strong>
          </span>
          <span className="hidden h-4 w-px bg-slate-700 sm:block" />
          <span className="flex items-center gap-2">
            Pay with <PaymentBadge provider="bkash" /> <PaymentBadge provider="nagad" />
          </span>
        </div>
      </div>

      <HeroVisual />
    </section>
  );
}
