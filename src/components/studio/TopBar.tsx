"use client";

import {
  Download,
  FlaskConical,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ExpiryCountdown } from "@/components/studio/ExpiryCountdown";
import { UploadAudioButton } from "@/components/studio/UploadAudioButton";
import { STATUS_META } from "@/lib/studio-meta";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

export function TopBar() {
  const title = useStudioStore((s) => s.project.title);
  const status = useStudioStore((s) => s.project.status);
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const renderProgress = useStudioStore((s) => s.renderProgress);
  const renameProject = useStudioStore((s) => s.renameProject);
  const toggleUnlocked = useStudioStore((s) => s.toggleUnlocked);
  const openExportModal = useStudioStore((s) => s.openExportModal);
  const openApiSettings = useStudioStore((s) => s.openApiSettings);
  const geminiApiKey = useStudioStore((s) => s.geminiApiKey);

  const statusMeta = STATUS_META[status];
  const isRendering = status === "rendering_full";
  const isBusy = status === "analyzing" || status === "idle";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-3 backdrop-blur md:px-4">
      <Logo className="shrink-0" href="/" />
      <div className="hidden h-5 w-px bg-slate-800 sm:block" />

      <div className="min-w-0 flex-1">
        <input
          value={title}
          onChange={(e) => renameProject(e.target.value)}
          aria-label="Project title"
          spellCheck={false}
          className="w-full max-w-md truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-white outline-none transition hover:border-slate-800 focus:border-indigo-500/60 focus:bg-slate-900"
        />
        <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-500">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
          {statusMeta.label}
          {isRendering && <span className="font-mono text-violet-300">{Math.floor(renderProgress)}%</span>}
        </div>
      </div>

      <div className="hidden lg:block">
        <ExpiryCountdown />
      </div>

      {/* Gemini AI Settings button */}
      <button
        onClick={openApiSettings}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
          geminiApiKey
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400"
            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200",
        )}
        title={geminiApiKey ? "Gemini 2.5 Flash active" : "Configure Gemini API Key"}
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span className="hidden md:inline">API</span>
        {geminiApiKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </button>

      <UploadAudioButton />

      {/* Dev toggle: 30s paywall vs unlocked */}
      <button
        onClick={toggleUnlocked}
        disabled={isBusy}
        role="switch"
        aria-checked={isUnlocked}
        title="Dev toggle: flip between 30s paywall and unlocked full video"
        className="hidden items-center gap-2 rounded-lg border border-dashed border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-50 md:flex"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">Paywall demo</span>
        <span
          className={cn(
            "relative h-4 w-7 rounded-full transition",
            isUnlocked ? "bg-emerald-500" : "bg-slate-700",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
              isUnlocked ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
      </button>

      {/* Export / Unlock Full Video */}
      <button
        onClick={openExportModal}
        disabled={isBusy || isRendering}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          isUnlocked
            ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500"
            : "bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-600/30 hover:from-indigo-400 hover:to-violet-500",
        )}
      >
        {!isUnlocked && <Lock className="h-3.5 w-3.5" />}
        {isUnlocked && isRendering && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {isUnlocked && !isRendering && <Download className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">
          {!isUnlocked ? "Export / Unlock" : isRendering ? "Rendering…" : "Export Video"}
        </span>
        <span className="sm:hidden">{!isUnlocked ? "Unlock" : "Export"}</span>
      </button>
    </header>
  );
}
