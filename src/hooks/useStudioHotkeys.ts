"use client";

import { useEffect } from "react";
import { useStudioStore } from "@/store/useStudioStore";

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.closest("input, textarea, select, button, [role='slider'], [role='dialog']") !== null
  );
};

/** Space = play/pause, ←/→ = previous/next scene. Ignored while typing or inside dialogs. */
export function useStudioHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const { togglePlay, stepScene } = useStudioStore.getState();

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepScene(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepScene(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
