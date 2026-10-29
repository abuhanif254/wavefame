"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  CAMERA_EFFECTS,
  CAMERA_META,
  SCENE_TYPES,
  SCENE_TYPE_META,
  SFX_META,
  SOUND_EFFECTS,
} from "@/lib/studio-meta";
import { cn, formatRange } from "@/lib/utils";
import { sfxEngine } from "@/services/sfxEngine";
import { selectSelectedScene, useStudioStore } from "@/store/useStudioStore";

const MAX_TEXT = 60;
const MAX_PROMPT = 400;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {hint && <span className="font-mono text-[10px] text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "w-full resize-none rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500/60 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20";

export function SceneInspector() {
  const scene = useStudioStore(selectSelectedScene);
  const updateScene = useStudioStore((s) => s.updateScene);

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-950" aria-label="Scene inspector">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
          Scene Inspector
        </div>
        {scene && (
          <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400 ring-1 ring-slate-800">
            #{(scene.index + 1).toString().padStart(3, "0")} · {formatRange(scene.startTime, scene.endTime)}
          </span>
        )}
      </header>

      {!scene ? (
        <div className="grid flex-1 place-items-center p-6 text-center text-sm text-slate-500">
          Select a scene to edit its text, visual, camera and sound.
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Narration</div>
            <p className="text-[13px] leading-relaxed text-slate-300">&ldquo;{scene.transcriptSegment}&rdquo;</p>
          </div>

          <Field label="On-screen kinetic text" hint={`${scene.onScreenText.length}/${MAX_TEXT}`}>
            <textarea
              rows={2}
              aria-label="On-screen kinetic text"
              maxLength={MAX_TEXT}
              value={scene.onScreenText}
              onChange={(e) => updateScene(scene.id, { onScreenText: e.target.value })}
              placeholder="Text that animates over this scene"
              className={cn(inputClass, "font-semibold uppercase tracking-tight")}
            />
          </Field>

          <Field label="Visual type">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Visual type">
              {SCENE_TYPES.map((type) => {
                const meta = SCENE_TYPE_META[type];
                const Icon = meta.icon;
                const active = scene.visualType === type;
                return (
                  <button
                    key={type}
                    role="radio"
                    aria-checked={active}
                    onClick={() => updateScene(scene.id, { visualType: type })}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition",
                      active
                        ? "border-indigo-400/60 bg-indigo-500/10 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                    )}
                  >
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md border", meta.badge)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="AI image prompt" hint={`${scene.imagePrompt.length}/${MAX_PROMPT}`}>
            <textarea
              rows={4}
              aria-label="AI image prompt"
              maxLength={MAX_PROMPT}
              value={scene.imagePrompt}
              onChange={(e) => updateScene(scene.id, { imagePrompt: e.target.value })}
              placeholder="Describe the visual for this scene…"
              className={inputClass}
            />
          </Field>

          <Field label="Camera movement">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Camera movement">
              {CAMERA_EFFECTS.map((effect) => {
                const { label, icon: Icon } = CAMERA_META[effect];
                const active = scene.cameraEffect === effect;
                return (
                  <button
                    key={effect}
                    role="radio"
                    aria-checked={active}
                    onClick={() => updateScene(scene.id, { cameraEffect: effect })}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition",
                      effect === "static" && "col-span-2",
                      active
                        ? "border-indigo-400/60 bg-indigo-500/10 text-white"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active ? "text-indigo-300" : "text-slate-500")} />
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Auto sound effect">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sound effect">
              {SOUND_EFFECTS.map((sfx) => {
                const { label, icon: Icon, badge } = SFX_META[sfx];
                const active = scene.sfx === sfx;
                return (
                  <button
                    key={sfx}
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      updateScene(scene.id, { sfx });
                      sfxEngine.play(sfx);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      active ? badge : "border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300",
                      active && "ring-1 ring-white/20",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}
    </section>
  );
}
