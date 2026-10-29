import { Camera, Lock, Play, Volume2 } from "lucide-react";
import { SCENE_TYPE_META } from "@/lib/studio-meta";
import { hash, sceneGradient } from "@/lib/visuals";
import { cn } from "@/lib/utils";

const TYPES = ["ai_grid_panel", "motion_graphic", "stock_footage", "kinetic_text"] as const;

/** Static, server-rendered mini studio mock used as the hero visual. */
export function HeroVisual() {
  const blocks = Array.from({ length: 40 }, (_, i) => i);
  const preview = 14; // blocks before the paywall marker

  return (
    <div className="relative mx-auto mt-16 w-full max-w-5xl animate-float">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-full bg-gradient-to-b from-indigo-600/25 via-violet-600/10 to-transparent blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-indigo-950/60 backdrop-blur">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="ml-3 text-xs text-slate-500">How Large Language Models Actually Work</span>
          <span className="ml-auto rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
            Auto-delete in 23h 59m
          </span>
        </div>

        <div className="grid gap-px bg-white/5 md:grid-cols-[1fr_2fr_1fr]">
          {/* script */}
          <div className="hidden space-y-2 bg-slate-950/80 p-3 md:block">
            {[0, 1, 2, 3].map((i) => {
              const meta = SCENE_TYPE_META[TYPES[i]];
              return (
                <div key={i} className={cn("rounded-lg border p-2.5", i === 1 ? "border-indigo-400/40 bg-indigo-500/10" : "border-transparent bg-slate-900/60")}>
                  <div className="font-mono text-[10px] text-slate-500">00:0{i * 2} - 00:0{i * 2 + 2}</div>
                  <div className="mt-1 h-2 w-4/5 rounded bg-slate-700/70" />
                  <div className="mt-1 h-2 w-3/5 rounded bg-slate-800" />
                  <span className={cn("mt-2 inline-block rounded border px-1.5 py-0.5 text-[9px] font-medium", meta.badge)}>{meta.short}</span>
                </div>
              );
            })}
          </div>

          {/* player */}
          <div className="relative aspect-video bg-slate-950 md:aspect-auto md:min-h-[260px]">
            <div className="absolute inset-0" style={{ background: sceneGradient(7) }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.35),transparent_60%)]" />
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="text-2xl font-black uppercase leading-none tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-4xl">
                Attention is all you need
              </span>
            </div>
            <div className="absolute left-3 top-3 flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/85"><Camera className="h-3 w-3" /> Punch In</span>
              <span className="inline-flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/85"><Volume2 className="h-3 w-3" /> Cinematic Hit</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-950"><Play className="ml-0.5 h-3.5 w-3.5" /></span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                <div className="locked-hatch absolute inset-y-0 right-0 w-[60%]" />
              </div>
              <Lock className="h-3.5 w-3.5 text-amber-300" />
            </div>
          </div>

          {/* inspector */}
          <div className="hidden space-y-3 bg-slate-950/80 p-3 md:block">
            {["On-screen text", "Visual type", "Camera", "Sound FX"].map((label) => (
              <div key={label}>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
                <div className="mt-1 h-6 rounded-md border border-slate-800 bg-slate-900/70" />
              </div>
            ))}
          </div>
        </div>

        {/* timeline */}
        <div className="border-t border-white/5 bg-slate-950/80 p-3">
          <div className="flex h-10 overflow-hidden rounded-md ring-1 ring-slate-800">
            {blocks.map((i) => (
              <div
                key={i}
                className={cn("h-full flex-1 border-r border-slate-950", i === 5 && "brightness-150", i >= preview && "opacity-40")}
                style={{ background: sceneGradient(hash(i) % 97) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
