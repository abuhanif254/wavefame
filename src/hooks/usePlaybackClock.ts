"use client";

import { useEffect, useRef } from "react";
import { getPlayableLimit, useStudioStore } from "@/store/useStudioStore";
import { sfxEngine } from "@/services/sfxEngine";

/**
 * Synchronized Playback Clock:
 * 1. Drives time progression (either from real <audio> or virtual rAF timer).
 * 2. Triggers synthesized Web Audio SFX on scene transitions.
 * 3. Enforces 30s Paywall lock when isUnlocked === false.
 */
export function usePlaybackClock(): void {
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const selectedSceneId = useStudioStore((s) => s.selectedSceneId);
  const audioUrl = useStudioStore((s) => s.project.audioUrl);

  const prevSceneIdRef = useRef<string | null>(selectedSceneId);

  // Trigger sound effect on active scene transition during playback
  useEffect(() => {
    if (!isPlaying) {
      prevSceneIdRef.current = selectedSceneId;
      return;
    }

    if (selectedSceneId && selectedSceneId !== prevSceneIdRef.current) {
      prevSceneIdRef.current = selectedSceneId;
      const scene = useStudioStore.getState().project.scenes.find((s) => s.id === selectedSceneId);
      if (scene && scene.sfx && scene.sfx !== "none") {
        sfxEngine.play(scene.sfx);
      }
    }
  }, [selectedSceneId, isPlaying]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const { currentTime, project, setCurrentTime, setPlaying } = useStudioStore.getState();
      const limit = getPlayableLimit(project);

      // Check for real DOM audio element if loaded
      const audioEl = document.getElementById("studio-real-audio") as HTMLAudioElement | null;

      let next = currentTime + dt;
      if (audioEl && audioUrl && !audioEl.paused && Number.isFinite(audioEl.currentTime)) {
        next = audioEl.currentTime;
      }

      if (next >= limit) {
        if (audioEl) {
          audioEl.pause();
          audioEl.currentTime = limit;
        }
        setCurrentTime(limit);
        setPlaying(false);
        return;
      }

      setCurrentTime(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioUrl]);
}
