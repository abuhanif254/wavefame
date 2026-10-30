import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { BRAND_NAME } from "@/lib/constants";

export function FinalCta() {
  return (
    <section className="px-5 pb-24">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/25 via-slate-900 to-violet-600/20 px-6 py-14 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your next 20-minute audio is a video waiting to happen.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Open the studio demo with a pre-loaded 20-minute project. No sign-up needed.
        </p>
        <Link
          href="/studio"
          className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Try Studio Demo
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
        <Logo />
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {BRAND_NAME}. Uploaded files auto-delete after 24 hours.
        </p>
      </div>
    </footer>
  );
}
