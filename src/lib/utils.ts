import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** 75 -> "01:15" */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/** (0, 2) -> "00:00 - 00:02" */
export function formatRange(startSec: number, endSec: number): string {
  return `${formatClock(startSec)} - ${formatClock(endSec)}`;
}

/** 1170 -> "19m 30s" */
export function formatLongDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

/** ms -> "23h 59m 12s" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${pad2(m)}m ${pad2(s)}s`;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}
