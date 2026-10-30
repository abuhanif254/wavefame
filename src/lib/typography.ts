/**
 * Bilingual Typography & High-Retention Subtitles
 * Supports Bengali (Unicode [\u0980-\u09FF]) and English Latin script.
 */

export type CaptionStyle = "youtube_yellow" | "classic" | "minimal_glass";

export function isBengaliText(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0980-\u09FF]/.test(text);
}

export function getFontFamilyForText(text?: string | null): string {
  return isBengaliText(text)
    ? "'Hind Siliguri', 'Nirmala UI', sans-serif"
    : "'Plus Jakarta Sans', 'Inter', sans-serif";
}

export interface CaptionStyleConfig {
  id: CaptionStyle;
  label: string;
  badge: string;
  containerClass: string;
  textClass: string;
}

export const CAPTION_STYLES: Record<CaptionStyle, CaptionStyleConfig> = {
  youtube_yellow: {
    id: "youtube_yellow",
    label: "Bold YouTube Yellow",
    badge: "HIGH RETENTION",
    containerClass: "bg-black/85 border border-yellow-400/40 shadow-xl shadow-yellow-950/40",
    textClass: "text-yellow-400 font-extrabold uppercase tracking-wide [text-shadow:0_2px_12px_rgba(250,204,21,0.5)]",
  },
  classic: {
    id: "classic",
    label: "Classic Documentary",
    badge: "CINEMATIC",
    containerClass: "bg-slate-950/85 border border-white/10 shadow-lg",
    textClass: "text-slate-100 font-semibold tracking-normal",
  },
  minimal_glass: {
    id: "minimal_glass",
    label: "Minimal Glass",
    badge: "MODERN",
    containerClass: "bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl",
    textClass: "text-white font-medium tracking-tight",
  },
};
