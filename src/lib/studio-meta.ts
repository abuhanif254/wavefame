import {
  ArrowLeft,
  ArrowRight,
  ChartColumn,
  Film,
  Flame,
  Keyboard,
  LayoutGrid,
  Sparkle,
  Square,
  Type,
  VolumeX,
  Wind,
  Zap,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import type { CameraEffect, ProjectStatus, SceneType, SoundEffect } from "@/types/studio";

interface SceneTypeMeta {
  label: string;
  short: string;
  icon: LucideIcon;
  badge: string;
  bar: string;
}

export const SCENE_TYPE_META: Record<SceneType, SceneTypeMeta> = {
  ai_grid_panel: {
    label: "AI Grid 2x2",
    short: "AI Grid",
    icon: LayoutGrid,
    badge: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    bar: "bg-violet-400",
  },
  motion_graphic: {
    label: "Motion Chart",
    short: "Motion Graphic",
    icon: ChartColumn,
    badge: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    bar: "bg-sky-400",
  },
  stock_footage: {
    label: "Stock Footage",
    short: "Stock",
    icon: Film,
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    bar: "bg-amber-400",
  },
  kinetic_text: {
    label: "Kinetic Text",
    short: "Kinetic Text",
    icon: Type,
    badge: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300",
    bar: "bg-fuchsia-400",
  },
};

export const SCENE_TYPES = Object.keys(SCENE_TYPE_META) as SceneType[];

export const CAMERA_META: Record<CameraEffect, { label: string; icon: LucideIcon }> = {
  zoom_in_slow: { label: "Slow Zoom", icon: ZoomIn },
  punch_in_fast: { label: "Punch In", icon: Zap },
  pan_left: { label: "Pan Left", icon: ArrowLeft },
  pan_right: { label: "Pan Right", icon: ArrowRight },
  static: { label: "Static", icon: Square },
};

export const CAMERA_EFFECTS = Object.keys(CAMERA_META) as CameraEffect[];

export const SFX_META: Record<SoundEffect, { label: string; icon: LucideIcon; badge: string }> = {
  whoosh: { label: "Whoosh", icon: Wind, badge: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300" },
  typewriter: {
    label: "Typewriter",
    icon: Keyboard,
    badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  cinematic_hit: {
    label: "Cinematic Hit",
    icon: Flame,
    badge: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  },
  pop: { label: "Pop", icon: Sparkle, badge: "border-indigo-400/25 bg-indigo-500/10 text-indigo-300" },
  none: { label: "No SFX", icon: VolumeX, badge: "border-slate-600/40 bg-slate-800/60 text-slate-400" },
};

export const SOUND_EFFECTS = Object.keys(SFX_META) as SoundEffect[];

export const STATUS_META: Record<ProjectStatus, { label: string; dot: string }> = {
  idle: { label: "Idle", dot: "bg-slate-500" },
  analyzing: { label: "Analyzing audio", dot: "bg-amber-400 animate-pulse" },
  preview_ready: { label: "Preview ready", dot: "bg-indigo-400" },
  rendering_full: { label: "Rendering full video", dot: "bg-violet-400 animate-pulse" },
  completed: { label: "Completed", dot: "bg-emerald-400" },
};
