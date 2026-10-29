"use client";

import { memo, useEffect, useRef } from "react";
import { Lock, ScrollText } from "lucide-react";
import type { SceneNode } from "@/types/studio";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { SCENE_TYPE_META, SFX_META } from "@/lib/studio-meta";
import { cn, formatRange } from "@/lib/utils";
import { useStudioStore } from "@/store/useStudioStore";

interface RowProps {
  scene: SceneNode;
  selected: boolean;
  locked: boolean;
  onSelect: (id: string) => void;
}

const SceneRow = memo(function SceneRow({ scene, selected, locked, onSelect }: RowProps) {
  const type = SCENE_TYPE_META[scene.visualType];
  const sfx = SFX_META[scene.sfx];
  const TypeIcon = type.icon;
  const SfxIcon = sfx.icon;

  return (
    <button
      id={`scene-row-${scene.id}`}
      onClick={() => onSelect(scene.id)}
      aria-current={selected}
      className={cn(
        "row-cv group relative block w-full rounded-lg border px-3 py-2.5 text-left transition",
        selected
          ? "border-indigo-400/50 bg-indigo-500/10"
          : "border-transparent hover:border-slate-800 hover:bg-slate-900/70",
        locked && !selected && "opacity-60",
      )}
    >
      {selected && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-indigo-400" />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-600">#{(scene.index + 1).toString().padStart(3, "0")}</span>
          <span className="font-mono text-[11px] font-medium tabular-nums text-slate-400">
            {formatRange(scene.startTime, scene.endTime)}
          </span>
        </div>
        {locked && <Lock className="h-3 w-3 text-slate-600" aria-label="Locked in free preview" />}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-slate-200">{scene.transcriptSegment}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", type.badge)}>
          <TypeIcon className="h-3 w-3" />
          {type.short}
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", sfx.badge)}>
          <SfxIcon className="h-3 w-3" />
          {sfx.label}
        </span>
      </div>
    </button>
  );
});

export function SceneList() {
  const scenes = useStudioStore((s) => s.project.scenes);
  const selectedId = useStudioStore((s) => s.selectedSceneId);
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const selectScene = useStudioStore((s) => s.selectScene);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the active row visible while playback advances (scrolls the list only, never the page).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selectedId) return;
    const row = container.querySelector<HTMLElement>(`#scene-row-${selectedId}`);
    if (!row) return;
    const top = row.offsetTop; // container is `relative`, so this is container-relative
    const bottom = top + row.offsetHeight;
    if (top < container.scrollTop + 8 || bottom > container.scrollTop + container.clientHeight - 8) {
      container.scrollTo({ top: top - container.clientHeight / 3, behavior: "smooth" });
    }
  }, [selectedId]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-950" aria-label="Scene script and breakdown">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ScrollText className="h-4 w-4 text-indigo-400" />
          Script &amp; Scenes
        </div>
        <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400 ring-1 ring-slate-800">
          {scenes.length} scenes
        </span>
      </header>

      <div ref={containerRef} className="relative min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {scenes.length === 0 && (
          <div className="space-y-2 p-1" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-[84px] animate-pulse rounded-lg bg-slate-900/70" />
            ))}
          </div>
        )}

        {scenes.map((scene) => {
          const locked = !isUnlocked && scene.startTime >= PREVIEW_LIMIT_SEC;
          const isBoundary = !isUnlocked && scene.startTime === PREVIEW_LIMIT_SEC;
          return (
            <div key={scene.id}>
              {isBoundary && (
                <div className="my-2 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                  <span className="h-px flex-1 bg-amber-400/30" />
                  <Lock className="h-3 w-3" /> Free preview ends
                  <span className="h-px flex-1 bg-amber-400/30" />
                </div>
              )}
              <SceneRow scene={scene} selected={scene.id === selectedId} locked={locked} onSelect={selectScene} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
