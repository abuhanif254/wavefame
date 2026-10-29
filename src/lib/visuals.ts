import type { SceneType } from "@/types/studio";

/** Deterministic 32-bit hash so mock visuals are stable across SSR and client. */
export function hash(n: number): number {
  let x = Math.imul(n + 1, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return x >>> 0;
}

/** Hue pairs staying inside the indigo / violet / cyan family. */
const HUE_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [243, 271],
  [262, 291],
  [222, 262],
  [190, 243],
  [280, 320],
  [205, 255],
  [252, 300],
  [230, 280],
];

export function sceneHues(index: number, variant = 0): [number, number] {
  const [a, b] = HUE_PAIRS[hash(index * 7 + variant * 131) % HUE_PAIRS.length];
  return [a, b];
}

export function gradient(h1: number, h2: number, angle = 135): string {
  return `linear-gradient(${angle}deg, hsl(${h1} 72% 42%), hsl(${h2} 70% 14%))`;
}

export function sceneGradient(index: number, variant = 0): string {
  const [h1, h2] = sceneHues(index, variant);
  return gradient(h1, h2);
}

/**
 * Lightweight SVG "frame" used as a placeholder previewUrl / timeline thumbnail.
 * Pure string output: no canvas, no Node APIs, safe on the edge.
 */
export function makePreviewUrl(index: number, type: SceneType): string {
  const [h1, h2] = sceneHues(index);
  const h = hash(index);
  let shapes = "";

  switch (type) {
    case "ai_grid_panel":
      shapes = [0, 1, 2, 3]
        .map((n) => {
          const [a, b] = sceneHues(index, n);
          const x = (n % 2) * 82 + 6;
          const y = Math.floor(n / 2) * 44 + 4;
          return `<rect x="${x}" y="${y}" width="78" height="40" rx="4" fill="hsl(${a} 70% 40%)" opacity=".85"/><circle cx="${x + 20 + (n * 11) % 30}" cy="${y + 20}" r="10" fill="hsl(${b} 80% 65%)" opacity=".5"/>`;
        })
        .join("");
      break;
    case "motion_graphic":
      shapes = Array.from({ length: 7 }, (_, n) => {
        const bh = 14 + ((h >>> (n * 3)) % 54);
        return `<rect x="${14 + n * 22}" y="${88 - bh}" width="14" height="${bh}" rx="2" fill="hsl(${h2} 85% 68%)" opacity=".85"/>`;
      }).join("");
      break;
    case "stock_footage":
      shapes = `<circle cx="${40 + (h % 80)}" cy="30" r="34" fill="hsl(${h2} 90% 70%)" opacity=".35"/><rect y="0" width="176" height="9" fill="#020617"/><rect y="79" width="176" height="9" fill="#020617"/>`;
      break;
    case "kinetic_text":
      shapes = `<rect x="18" y="30" width="140" height="10" rx="5" fill="#fff" opacity=".9"/><rect x="38" y="50" width="100" height="10" rx="5" fill="#fff" opacity=".55"/>`;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 88"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 72% 40%)"/><stop offset="1" stop-color="hsl(${h2} 70% 12%)"/></linearGradient></defs><rect width="176" height="88" fill="url(#g)"/>${shapes}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
