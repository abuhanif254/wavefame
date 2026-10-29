import type { SceneNode } from "@/types/studio";

/** Binary search: index of the last scene whose startTime <= t (clamped to valid range). */
export function findSceneIndexAtTime(scenes: readonly SceneNode[], t: number): number {
  if (scenes.length === 0) return -1;
  let lo = 0;
  let hi = scenes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (scenes[mid].startTime <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
