"use client";

import { useState } from "react";
import { ScrollText, SlidersHorizontal, Clapperboard } from "lucide-react";
import { AnalysisOverlay } from "@/components/studio/AnalysisOverlay";
import { ApiSettingsModal } from "@/components/studio/ApiSettingsModal";
import { ExportModal } from "@/components/studio/ExportModal";
import { ExpiryCountdown } from "@/components/studio/ExpiryCountdown";
import { PreviewPlayer } from "@/components/studio/PreviewPlayer";
import { SceneInspector } from "@/components/studio/SceneInspector";
import { SceneList } from "@/components/studio/SceneList";
import { Timeline } from "@/components/studio/Timeline";
import { TopBar } from "@/components/studio/TopBar";
import { UnlockModal } from "@/components/studio/UnlockModal";
import { usePlaybackClock } from "@/hooks/usePlaybackClock";
import { useStudioHotkeys } from "@/hooks/useStudioHotkeys";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

type Pane = "script" | "preview" | "inspector";

const PANES: ReadonlyArray<{ id: Pane; label: string; icon: typeof ScrollText }> = [
  { id: "script", label: "Script", icon: ScrollText },
  { id: "preview", label: "Preview", icon: Clapperboard },
  { id: "inspector", label: "Inspector", icon: SlidersHorizontal },
];

export default function StudioPage() {
  usePlaybackClock();
  useStudioHotkeys();

  const isAnalyzing = useStudioStore((s) => s.project.status === "analyzing");
  const [pane, setPane] = useState<Pane>("preview");

  // On < lg screens only one pane is visible at a time; at lg+ all three show side by side.
  const paneClass = (id: Pane) => cn("min-h-0 min-w-0", pane === id ? "block" : "hidden", "lg:block");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      <TopBar />

      <div className="flex shrink-0 items-center justify-center border-b border-red-500/20 bg-red-500/5 py-1.5 lg:hidden">
        <ExpiryCountdown />
      </div>

      <nav className="flex shrink-0 border-b border-slate-800 lg:hidden" aria-label="Editor panes">
        {PANES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPane(id)}
            aria-pressed={pane === id}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition",
              pane === id ? "border-b-2 border-indigo-400 text-white" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <main className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)_minmax(300px,22rem)]">
        <div className={cn(paneClass("script"), "border-r border-slate-800")}>
          <SceneList />
        </div>
        <div className={paneClass("preview")}>
          <PreviewPlayer />
        </div>
        <div className={cn(paneClass("inspector"), "border-l border-slate-800")}>
          <SceneInspector />
        </div>
        {isAnalyzing && <AnalysisOverlay />}
      </main>

      <div className="h-[9.5rem] shrink-0 md:h-44">
        <Timeline />
      </div>

      <UnlockModal />
      <ApiSettingsModal />
      <ExportModal />
    </div>
  );
}
