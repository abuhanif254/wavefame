"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { PaymentBadge } from "@/components/shared/PaymentBadge";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { SINGLE_PRICE_BDT, formatBdt } from "@/lib/pricing";
import { formatLongDuration } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

/** Glassmorphic overlay shown when playback reaches the free-preview limit while locked. */
export function PaywallOverlay() {
  const audioDurationSec = useStudioStore((s) => s.project.audioDurationSec);
  const openUnlockModal = useStudioStore((s) => s.openUnlockModal);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);

  const remaining = formatLongDuration(audioDurationSec - PREVIEW_LIMIT_SEC);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-[4%] backdrop-blur-md animate-fade-in"
      role="alertdialog"
      aria-label="Free preview ended"
    >
      <div className="relative w-full max-w-[34rem] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 p-5 text-center shadow-2xl shadow-indigo-950/70 backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
            You&apos;ve watched the {PREVIEW_LIMIT_SEC}-second high-retention preview!{" "}
            <strong className="font-semibold text-white">
              Unlock the remaining {remaining} in 1080p for only {formatBdt(SINGLE_PRICE_BDT)}
            </strong>{" "}
            (bKash / Nagad).
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <PaymentBadge provider="bkash" />
            <PaymentBadge provider="nagad" />
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              onClick={openUnlockModal}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-400 hover:to-violet-500 active:scale-[0.98] sm:w-auto"
            >
              Unlock Full Video · {formatBdt(SINGLE_PRICE_BDT)}
            </button>
            <button
              onClick={() => setCurrentTime(0)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 sm:w-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
