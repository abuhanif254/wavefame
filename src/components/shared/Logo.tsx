import Link from "next/link";
import { AudioWaveform } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-transform group-hover:scale-105">
        <AudioWaveform className="h-4 w-4 text-white" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">{BRAND_NAME}</span>
    </Link>
  );
}
