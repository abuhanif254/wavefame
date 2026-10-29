"use client";

import { AudioWaveform } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";

/** Covers the editor panes while an uploaded file moves through the analysis pipeline. */
export function AnalysisOverlay() {
  const progress = useStudioStore((s) => s.analysisProgress);
  const stage = useStudioStore((s) => s.analysisStage);
  const title = useStudioStore((s) => s.project.title);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/85 p-6 backdrop-blur-md animate-fade-in" role="status">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
          <AudioWaveform className="h-7 w-7 animate-pulse-glow text-indigo-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">Analyzing &ldquo;{title}&rdquo;</h2>
        <p className="mt-1 text-sm text-slate-400">{stage}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-500 bg-[length:200%_100%] animate-shimmer transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500">{Math.floor(progress)}%</p>
      </div>
    </div>
  );
}
