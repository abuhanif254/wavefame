"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Camera,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { SceneNode } from "@/types/studio";
import { PaywallOverlay } from "@/components/studio/PaywallOverlay";
import { SceneCanvas } from "@/components/studio/SceneCanvas";
import { Scrubber } from "@/components/studio/Scrubber";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { CAMERA_META, SCENE_TYPE_META, SFX_META } from "@/lib/studio-meta";
import { cn, formatClock } from "@/lib/utils";
import { selectIsPaywalled, selectSelectedScene, useStudioStore } from "@/store/useStudioStore";

function PlayerControls() {
  const currentTime = useStudioStore((s) => s.currentTime);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const duration = useStudioStore((s) => s.project.audioDurationSec);
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const isSfxMuted = useStudioStore((s) => s.isSfxMuted);
  const toggleSfxMute = useStudioStore((s) => s.toggleSfxMute);
  const togglePlay = useStudioStore((s) => s.togglePlay);
  const stepScene = useStudioStore((s) => s.stepScene);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);
  const audioFileName = useStudioStore((s) => s.project.audioFileName);

  const btn =
    "grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white";

  return (
    <div className="shrink-0 space-y-1.5 px-1 pt-3">
      <Scrubber
        value={currentTime}
        max={duration}
        lockedFrom={isUnlocked ? undefined : PREVIEW_LIMIT_SEC}
        onSeek={setCurrentTime}
        label="Playback position"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button className={btn} onClick={() => stepScene(-1)} aria-label="Previous scene" title="Previous scene (←)">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title="Play / Pause (Space)"
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-950 shadow transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button className={btn} onClick={() => stepScene(1)} aria-label="Next scene" title="Next scene (→)">
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Web Audio SFX Mute/Unmute Toggle */}
          <button
            onClick={toggleSfxMute}
            aria-label={isSfxMuted ? "Unmute sound effects" : "Mute sound effects"}
            title={isSfxMuted ? "Unmute transition sound effects" : "Mute transition sound effects"}
            className={cn(
              "ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition",
              isSfxMuted
                ? "border border-slate-700 bg-slate-900 text-slate-500"
                : "border border-cyan-400/40 bg-cyan-500/10 text-cyan-300",
            )}
          >
            {isSfxMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-300" />}
            <span>SFX</span>
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-slate-400">
          <span className="text-white font-medium">{formatClock(currentTime)}</span> / {formatClock(duration)}
        </div>

        <div className="flex items-center gap-2">
          {audioFileName && (
            <div
              className="hidden items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 xl:flex"
              title={`Playing uploaded audio: ${audioFileName}`}
            >
              <Music className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{audioFileName}</span>
            </div>
          )}

          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium sm:flex",
              isUnlocked ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300",
            )}
          >
            {isUnlocked ? "Full 1080p unlocked" : `Free preview · first ${PREVIEW_LIMIT_SEC}s`}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PreviewPlayer() {
  const scene = useStudioStore(selectSelectedScene);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isPaywalled = useStudioStore(selectIsPaywalled);
  const togglePlay = useStudioStore((s) => s.togglePlay);
  const audioUrl = useStudioStore((s) => s.project.audioUrl);
  const currentTime = useStudioStore((s) => s.currentTime);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize real <audio> element with playback state
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;

    if (isPlaying && !isPaywalled) {
      if (Math.abs(el.currentTime - currentTime) > 0.25) {
        el.currentTime = currentTime;
      }
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying, audioUrl, isPaywalled]);

  // Synchronize scrubber seeks to real <audio> element
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (Math.abs(el.currentTime - currentTime) > 0.35) {
      el.currentTime = currentTime;
    }
  }, [currentTime, audioUrl]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.08),transparent_60%)] p-3 md:p-5" aria-label="Preview player">
      {/* Real HTML5 Audio Element for synchronized playback */}
      {audioUrl && (
        <audio
          id="studio-real-audio"
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          className="hidden"
          onEnded={() => useStudioStore.getState().setPlaying(false)}
        />
      )}

      {/* size container so the 16:9 frame always fits the available pane */}
      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
        <div
          className="relative overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl shadow-black/60 ring-1 ring-white/5"
          style={{
            aspectRatio: "16 / 9",
            width: "min(100cqw, 100cqh * 16 / 9)",
            containerType: "inline-size",
          }}
        >
          {scene ? (
            <>
              <SceneCanvas scene={scene} isPlaying={isPlaying && !isPaywalled} />

              {/* HUD */}
              <SceneHud scene={scene} />

              {!isPaywalled && (
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="absolute inset-0 z-10 cursor-pointer focus-visible:ring-inset"
                />
              )}
              {isPaywalled && <PaywallOverlay />}
            </>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">Select a scene to preview</div>
          )}
        </div>
      </div>
      <PlayerControls />
    </section>
  );
}

function SceneHud({ scene }: { scene: SceneNode }) {
  const TypeIcon = SCENE_TYPE_META[scene.visualType].icon;
  return (
    <div className="pointer-events-none absolute left-[2.5%] top-[4%] z-10 flex flex-wrap items-center gap-1.5">
      <HudChip icon={<Camera className="h-3 w-3" />} label={CAMERA_META[scene.cameraEffect].label} />
      <HudChip icon={<TypeIcon className="h-3 w-3" />} label={SCENE_TYPE_META[scene.visualType].short} />
      {scene.sfx !== "none" && <HudChip icon={<Volume2 className="h-3 w-3" />} label={SFX_META[scene.sfx].label} />}
    </div>
  );
}

function HudChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md border border-white/10">
      {icon}
      {label}
    </span>
  );
}
