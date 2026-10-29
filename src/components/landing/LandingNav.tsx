import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex" aria-label="Primary">
          <a href="#how" className="transition hover:text-white">How it works</a>
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#pricing" className="transition hover:text-white">Pricing</a>
        </nav>
        <Link
          href="/studio"
          className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Try Studio Demo
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
