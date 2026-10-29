"use client";

import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Lock, Minus, Plus, Rows3 } from "lucide-react";
import type { SceneNode } from "@/types/studio";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { SCENE_TYPE_META, SFX_META } from "@/lib/studio-meta";
import { hash } from "@/lib/visuals";
import { clamp, cn, formatClock } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

const MIN_PPS = 6; // pixels per second
const MAX_PPS = 48;
const DEFAULT_PPS = 18;
const GUTTER = 12; // left padding inside the scroller

/* ------------------------------ Scene block ------------------------------ */

interface BlockProps {
  scene: SceneNode;
  selected: boolean;
  pps: number;
  onSelect: (id: string) => void;
}

const SceneBlock = memo(function SceneBlock({ scene, selected, pps, onSelect }: BlockProps) {
  const type = SCENE_TYPE_META[scene.visualType];
  const width = (scene.endTime - scene.startTime) * pps;
  const hasSfx = scene.sfx !== "none";

  return (
    <button
      onClick={() => onSelect(scene.id)}
      style={{ width, backgroundImage: scene.previewUrl ? `url("${scene.previewUrl}")` : undefined }}
      title={`#${scene.index + 1} · ${formatClock(scene.startTime)} · ${type.short} · ${SFX_META[scene.sfx].label}`}
      aria-label={`Scene ${scene.index + 1}, ${type.short}`}
      aria-current={selected}
      className={cn(
        "relative h-full shrink-0 overflow-hidden border-r border-slate-950 bg-cover bg-center transition-[filter,box-shadow]",
        selected
          ? "z-10 shadow-[0_0_0_2px_theme(colors.indigo.400)] brightness-125"
          : "brightness-90 hover:brightness-110",
      )}
    >
      <span className={cn("absolute inset-x-0 bottom-0 h-[3px]", type.bar)} />
      {hasSfx && <span className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-white/80" />}
      {width >= 30 && (
        <span className="absolute left-1 top-0.5 font-mono text-[9px] font-medium text-white/80 drop-shadow">
          {scene.index + 1}
        </span>
      )}
    </button>
  );
});

/* -------------------------------- Playhead ------------------------------- */

function Playhead({ pps, scrollerRef }: { pps: number; scrollerRef: RefObject<HTMLDivElement | null> }) {
  const currentTime = useStudioStore((s) => s.currentTime);
  const x = GUTTER + currentTime * pps;

  // Auto-follow: keep the playhead inside the visible region.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (x < el.scrollLeft + 20 || x > el.scrollLeft + el.clientWidth - 60) {
      el.scrollLeft = Math.max(0, x - el.clientWidth * 0.25);
    }
  }, [x, scrollerRef]);

  return (
    <div className="pointer-events-none absolute inset-y-0 z-30" style={{ left: x }}>
      <div className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-rose-500" />
      <div className="absolute inset-y-0 -left-px w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
    </div>
  );
}

/* --------------------------------- Waveform ------------------------------- */

function Waveform({ duration, pps }: { duration: number; pps: number }) {
  // Two samples per second, deterministic amplitude with a little smoothing.
  const d = useMemo(() => {
    const n = Math.ceil(duration * 2);
    const parts: string[] = [];
    let prev = 0.5;
    for (let i = 0; i < n; i++) {
      const raw = (hash(i * 3 + 11) % 1000) / 1000;
      // Triangle wave = "speech phrasing" envelope. Avoids Math.sin, whose last-digit output can
      // differ between Node (SSR) and the browser and trigger hydration mismatches.
      const phrase = 0.55 + 0.45 * Math.abs((i % 56) / 28 - 1);
      prev = prev * 0.45 + raw * 0.55;
      const amp = Math.round(clamp(prev * phrase * 1.15, 0.08, 1) * 110) / 10;
      parts.push(`M${i + 0.5} ${(12 - amp).toFixed(1)}V${(12 + amp).toFixed(1)}`);
    }
    return parts.join("");
  }, [duration]);

  return (
    <svg
      width={duration * pps}
      height="24"
      viewBox={`0 0 ${duration * 2} 24`}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      <path d={d} stroke="rgb(129 140 248 / 0.6)" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

/* -------------------------------- Timeline -------------------------------- */

export function Timeline() {
  const scenes = useStudioStore((s) => s.project.scenes);
  const duration = useStudioStore((s) => s.project.audioDurationSec);
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const selectedId = useStudioStore((s) => s.selectedSceneId);
  const selectScene = useStudioStore((s) => s.selectScene);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);

  const [pps, setPps] = useState(DEFAULT_PPS);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const width = duration * pps;
  const tickStep = pps >= 30 ? 5 : pps >= 14 ? 10 : 30;
  const ticks = useMemo(
    () => Array.from({ length: Math.floor(duration / tickStep) + 1 }, (_, i) => i * tickStep),
    [duration, tickStep],
  );
  const lockedX = !isUnlocked && duration > PREVIEW_LIMIT_SEC ? PREVIEW_LIMIT_SEC * pps : null;

  const seekFromPointer = (clientX: number) => {
    const el = innerRef.current;
    if (!el) return;
    setCurrentTime((clientX - el.getBoundingClientRect().left) / pps);
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-slate-800 bg-slate-950" aria-label="Visual timeline">
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-slate-900 px-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Rows3 className="h-3.5 w-3.5 text-indigo-400" />
          Timeline
          <span className="hidden font-mono text-[10px] text-slate-600 sm:inline">
            {scenes.length} cuts · {formatClock(duration)}
          </span>
        </div>
        <div className="hidden items-center gap-3 text-[10px] text-slate-500 md:flex">
          {(["ai_grid_panel", "motion_graphic", "stock_footage", "kinetic_text"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-sm", SCENE_TYPE_META[t].bar)} />
              {SCENE_TYPE_META[t].short}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <button
            onClick={() => setPps((p) => clamp(Math.round(p / 1.4), MIN_PPS, MAX_PPS))}
            aria-label="Zoom out timeline"
            className="grid h-6 w-6 place-items-center rounded hover:bg-slate-800 hover:text-slate-200"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={MIN_PPS}
            max={MAX_PPS}
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            aria-label="Timeline zoom"
            className="h-1 w-20 cursor-pointer accent-indigo-500"
          />
          <button
            onClick={() => setPps((p) => clamp(Math.round(p * 1.4), MIN_PPS, MAX_PPS))}
            aria-label="Zoom in timeline"
            className="grid h-6 w-6 place-items-center rounded hover:bg-slate-800 hover:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative h-full" style={{ width: width + GUTTER * 2, minWidth: "100%" }}>
          <div ref={innerRef} className="absolute inset-y-0" style={{ left: GUTTER, width }}>
            {/* Ruler (click / drag to scrub) */}
            <div
              className="relative h-6 cursor-col-resize touch-none select-none border-b border-slate-900"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubbing.current = true;
                seekFromPointer(e.clientX);
              }}
              onPointerMove={(e) => scrubbing.current && seekFromPointer(e.clientX)}
              onPointerUp={() => (scrubbing.current = false)}
              onPointerCancel={() => (scrubbing.current = false)}
            >
              {ticks.map((t) => (
                <div key={t} className="absolute bottom-0 flex flex-col items-start" style={{ left: t * pps }}>
                  <span className="pl-1 font-mono text-[9px] leading-none text-slate-600">{formatClock(t)}</span>
                  <span className="mt-0.5 h-1.5 w-px bg-slate-700" />
                </div>
              ))}
              {lockedX !== null && (
                <div
                  className="absolute top-0 flex h-full items-center gap-1 whitespace-nowrap rounded-r bg-amber-500/15 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                  style={{ left: lockedX }}
                >
                  <Lock className="h-2.5 w-2.5" /> Paywall · {formatClock(PREVIEW_LIMIT_SEC)}
                </div>
              )}
            </div>

            {/* Video track */}
            <div className="mt-2 flex h-14 overflow-hidden rounded-md ring-1 ring-slate-800">
              {scenes.map((scene) => (
                <SceneBlock
                  key={scene.id}
                  scene={scene}
                  selected={scene.id === selectedId}
                  pps={pps}
                  onSelect={selectScene}
                />
              ))}
            </div>

            {/* Audio track */}
            <div className="mt-1.5 overflow-hidden rounded-md bg-slate-900/60 ring-1 ring-slate-800">
              <Waveform duration={duration} pps={pps} />
            </div>

            {/* Locked region overlay */}
            {lockedX !== null && (
              <>
                <div
                  className="locked-hatch pointer-events-none absolute bottom-0 top-6 z-20"
                  style={{ left: lockedX, right: 0 }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-amber-400/70"
                  style={{ left: lockedX }}
                />
              </>
            )}
          </div>

          <PlayheadLayer pps={pps} scrollerRef={scrollerRef} />
        </div>
      </div>
    </section>
  );
}

/** Wraps the playhead so it shares the same coordinate space as the scroller content. */
function PlayheadLayer({ pps, scrollerRef }: { pps: number; scrollerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Playhead pps={pps} scrollerRef={scrollerRef} />
    </div>
  );
}
