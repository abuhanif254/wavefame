/**
 * Core domain schema for the Hybrid Visual Engine.
 * Pure types only — safe to import from both client and edge/worker code.
 */

export type SceneType =
  | "ai_grid_panel"
  | "motion_graphic"
  | "stock_footage"
  | "kinetic_text";

export type CameraEffect =
  | "zoom_in_slow"
  | "punch_in_fast"
  | "pan_left"
  | "pan_right"
  | "static";

export type SoundEffect =
  | "whoosh"
  | "typewriter"
  | "cinematic_hit"
  | "pop"
  | "none";

export interface SceneNode {
  id: string;
  /** Zero-based position in the timeline. */
  index: number;
  /** Seconds from the start of the audio. */
  startTime: number;
  endTime: number;
  transcriptSegment: string;
  onScreenText: string;
  visualType: SceneType;
  imagePrompt: string;
  previewUrl?: string;
  cameraEffect: CameraEffect;
  sfx: SoundEffect;

  /** 1-to-4 AI Grid Slicer: quadrant 0: TL, 1: TR, 2: BL, 3: BR */
  quadrantIndex?: 0 | 1 | 2 | 3;
  gridMasterUrl?: string;
  gridMasterPrompt?: string;
}

export type ProjectStatus =
  | "idle"
  | "analyzing"
  | "preview_ready"
  | "rendering_full"
  | "completed";

export interface ProjectState {
  id: string;
  title: string;
  audioDurationSec: number;
  status: ProjectStatus;
  isUnlocked: boolean;
  /** ISO-8601 timestamp after which project assets are auto-deleted. */
  expiresAt: string;
  scenes: SceneNode[];
  /** Real uploaded audio source (blob URL or asset URL) */
  audioUrl?: string | null;
  audioFileName?: string | null;
}

/** Subset of scene fields that the inspector can edit. */
export type EditableSceneFields = Pick<
  SceneNode,
  | "onScreenText"
  | "imagePrompt"
  | "visualType"
  | "cameraEffect"
  | "sfx"
  | "gridMasterUrl"
  | "quadrantIndex"
>;

export type PricingPlanId = "single" | "creator_pack";

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  priceBdt: number;
  videos: number;
  description: string;
  perks: string[];
  highlighted?: boolean;
}

export type PaymentProvider = "bkash" | "nagad";
