"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { STORAGE_TTL_MS } from "@/lib/constants";
import { formatCountdown } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

/** Red 24-hour auto-delete badge. Rendered client-side only to avoid hydration drift. */
export function ExpiryCountdown() {
  const expiresAt = useStudioStore((s) => s.project.expiresAt);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? STORAGE_TTL_MS : Date.parse(expiresAt) - now;
  const expired = remaining <= 0;

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300"
      title="Uploaded audio and generated media are permanently deleted 24 hours after upload."
      role="timer"
      aria-live="off"
    >
      <Hourglass className="h-3.5 w-3.5 shrink-0 animate-pulse-glow" aria-hidden />
      {expired ? (
        <span>Storage expired. Files deleted</span>
      ) : (
        <span className="whitespace-nowrap">
          <span className="hidden xl:inline">Auto-delete: download within </span>
          <span className="xl:hidden">Delete in </span>
          <span className="font-mono tabular-nums text-red-200">
            {now === null ? "23h 59m" : formatCountdown(remaining)}
          </span>
        </span>
      )}
    </div>
  );
}
