"use client";

import { useRef } from "react";
import { Lock } from "lucide-react";
import { clamp, cn } from "@/lib/utils";

interface ScrubberProps {
  value: number;
  max: number;
  /** When set, time beyond this point is rendered as locked (paywall boundary). */
  lockedFrom?: number;
  onSeek: (t: number) => void;
  label?: string;
}

export function Scrubber({ value, max, lockedFrom, onSeek, label = "Seek" }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el || max <= 0) return;
    const rect = el.getBoundingClientRect();
    onSeek(clamp((clientX - rect.left) / rect.width, 0, 1) * max);
  };

  const pct = max > 0 ? (value / max) * 100 : 0;
  const lockPct = lockedFrom !== undefined && max > 0 ? (lockedFrom / max) * 100 : undefined;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className="group relative h-5 w-full cursor-pointer touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        seekFromPointer(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && seekFromPointer(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === "ArrowRight") onSeek(value + step);
        else if (e.key === "ArrowLeft") onSeek(value - step);
        else if (e.key === "Home") onSeek(0);
        else if (e.key === "End") onSeek(max);
        else return;
        e.preventDefault();
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-800 transition-all group-hover:h-2">
        {lockPct !== undefined && lockPct < 100 && (
          <div className="locked-hatch absolute inset-y-0 right-0" style={{ left: `${lockPct}%` }} />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      {lockPct !== undefined && lockPct < 100 && (
        <div
          className="pointer-events-none absolute top-1/2 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-400 text-slate-950 shadow"
          style={{ left: `${lockPct}%` }}
          title="Free preview ends here"
        >
          <Lock className="h-2.5 w-2.5" />
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-indigo-500/70 transition-transform group-hover:scale-110",
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
