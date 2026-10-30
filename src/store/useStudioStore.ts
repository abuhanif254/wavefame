import { create } from "zustand";
import type {
  EditableSceneFields,
  PricingPlanId,
  ProjectState,
  SceneNode,
} from "@/types/studio";
import {
  DEFAULT_AUDIO_DURATION_SEC,
  PREVIEW_LIMIT_SEC,
  STORAGE_TTL_MS,
} from "@/lib/constants";
import { DEMO_PROJECT_TITLE, generateMockScenes } from "@/lib/mock-data";
import { getPlan } from "@/lib/pricing";
import { findSceneIndexAtTime } from "@/lib/timeline";
import { clamp } from "@/lib/utils";
import type { CaptionStyle } from "@/lib/typography";
import { sfxEngine } from "@/services/sfxEngine";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface UploadInput {
  fileName?: string;
  durationSec?: number;
  file?: File;
}

export interface StudioState {
  project: ProjectState;
  selectedSceneId: string | null;
  /** Playhead position in seconds. */
  currentTime: number;
  isPlaying: boolean;
  isUnlockModalOpen: boolean;
  isExportModalOpen: boolean;
  isApiSettingsOpen: boolean;
  isSfxMuted: boolean;
  isBgmMuted: boolean;
  captionStyle: CaptionStyle;
  geminiApiKey: string;

  analysisProgress: number;
  analysisStage: string;
  renderProgress: number;
  /** Remaining full-video credits (from Creator Packs). */
  videoCredits: number;

  // Settings & Modals
  setGeminiApiKey: (key: string) => void;
  openApiSettings: () => void;
  closeApiSettings: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  toggleSfxMute: () => void;
  toggleBgmMute: () => void;
  setCaptionStyle: (style: CaptionStyle) => void;
  cycleCaptionStyle: () => void;

  // Studio operations
  renameProject: (title: string) => void;
  updateScene: (id: string, patch: Partial<EditableSceneFields>) => void;
  selectScene: (id: string) => void;
  stepScene: (delta: number) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  toggleUnlocked: () => void;
  openUnlockModal: () => void;
  closeUnlockModal: () => void;
  completePurchase: (planId: PricingPlanId) => void;
  startRender: () => void;
  simulateUpload: (input?: UploadInput) => void;
  uploadRealAudio: (file: File, durationSec: number) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ANALYSIS_STAGES: ReadonlyArray<{ upTo: number; label: string }> = [
  { upTo: 25, label: "Transcribing audio with Edge AI…" },
  { upTo: 50, label: "Detecting 2-second scene beats…" },
  { upTo: 75, label: "Routing scenes through the Hybrid Visual Engine…" },
  { upTo: 101, label: "Generating 2x2 AI master grids & frames…" },
];

const stageFor = (progress: number) =>
  (ANALYSIS_STAGES.find((s) => progress < s.upTo) ?? ANALYSIS_STAGES[ANALYSIS_STAGES.length - 1]).label;

const newExpiry = () => new Date(Date.now() + STORAGE_TTL_MS).toISOString();

function createDemoProject(): ProjectState {
  const scenes = generateMockScenes(DEFAULT_AUDIO_DURATION_SEC);
  return {
    id: "proj_demo_001",
    title: DEMO_PROJECT_TITLE,
    audioDurationSec: DEFAULT_AUDIO_DURATION_SEC,
    status: "preview_ready",
    isUnlocked: false,
    expiresAt: newExpiry(),
    scenes,
    audioUrl: null,
    audioFileName: null,
  };
}

export function getPlayableLimit(project: Pick<ProjectState, "isUnlocked" | "audioDurationSec">): number {
  return project.isUnlocked
    ? project.audioDurationSec
    : Math.min(PREVIEW_LIMIT_SEC, project.audioDurationSec);
}

let renderTimer: ReturnType<typeof setInterval> | null = null;
let analysisTimer: ReturnType<typeof setInterval> | null = null;

function clearTimer(timer: ReturnType<typeof setInterval> | null) {
  if (timer) clearInterval(timer);
  return null;
}

const getStoredApiKey = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("waveframe_gemini_api_key") || "";
};

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const initialProject = createDemoProject();

export const useStudioStore = create<StudioState>()((set, get) => ({
  project: initialProject,
  selectedSceneId: initialProject.scenes[0]?.id ?? null,
  currentTime: 0,
  isPlaying: false,
  isUnlockModalOpen: false,
  isExportModalOpen: false,
  isApiSettingsOpen: false,
  isSfxMuted: false,
  isBgmMuted: false,
  captionStyle: "youtube_yellow",
  geminiApiKey: getStoredApiKey(),

  analysisProgress: 0,
  analysisStage: "",
  renderProgress: 0,
  videoCredits: 0,

  setGeminiApiKey: (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("waveframe_gemini_api_key", key);
    }
    set({ geminiApiKey: key });
  },

  openApiSettings: () => set({ isApiSettingsOpen: true }),
  closeApiSettings: () => set({ isApiSettingsOpen: false }),
  openExportModal: () => set({ isPlaying: false, isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),

  toggleSfxMute: () => {
    const nextMuted = sfxEngine.toggleMute();
    set({ isSfxMuted: nextMuted });
  },

  toggleBgmMute: () => {
    const nextMuted = sfxEngine.toggleBgmMute();
    set({ isBgmMuted: nextMuted });
  },

  setCaptionStyle: (style) => set({ captionStyle: style }),

  cycleCaptionStyle: () => {
    const cur = get().captionStyle;
    const styles: CaptionStyle[] = ["youtube_yellow", "classic", "minimal_glass"];
    const nextIdx = (styles.indexOf(cur) + 1) % styles.length;
    set({ captionStyle: styles[nextIdx] });
  },

  renameProject: (title) => set((s) => ({ project: { ...s.project, title } })),

  updateScene: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        scenes: s.project.scenes.map((scene): SceneNode => {
          if (scene.id !== id) return scene;
          const next = { ...scene, ...patch };

          // If prompt or visualType was updated, generate real AI visual via Pollinations Flux
          if (patch.imagePrompt && patch.imagePrompt !== scene.imagePrompt) {
            next.previewUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(patch.imagePrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
            if (next.visualType === "ai_grid_panel") {
              next.gridMasterUrl = next.previewUrl;
            }
          } else if (patch.visualType && patch.visualType !== scene.visualType) {
            next.previewUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.imagePrompt)}?width=1280&height=720&nologo=true&seed=${scene.index * 13 + 7}`;
          }

          return next;
        }),
      },
    })),

  selectScene: (id) => {
    const scene = get().project.scenes.find((sc) => sc.id === id);
    if (!scene) return;
    set({ selectedSceneId: id, currentTime: scene.startTime });
  },

  stepScene: (delta) => {
    const { project, selectedSceneId } = get();
    const idx = project.scenes.findIndex((sc) => sc.id === selectedSceneId);
    const next = project.scenes[clamp(idx + delta, 0, project.scenes.length - 1)];
    if (next) get().selectScene(next.id);
  },

  setCurrentTime: (t) => {
    const { project, selectedSceneId } = get();
    const time = clamp(t, 0, project.audioDurationSec);
    const idx = findSceneIndexAtTime(project.scenes, time);
    const sceneId = idx >= 0 ? project.scenes[idx].id : selectedSceneId;
    set({ currentTime: time, selectedSceneId: sceneId });
  },

  setPlaying: (playing) => {
    if (playing) {
      sfxEngine.startBgm(true);
      sfxEngine.duckBgm(true);
    } else {
      sfxEngine.stopBgm();
    }
    set({ isPlaying: playing });
  },

  togglePlay: () => {
    const { isPlaying, project, currentTime } = get();
    if (isPlaying) {
      sfxEngine.stopBgm();
      return set({ isPlaying: false });
    }
    if (project.status === "analyzing" || project.scenes.length === 0) return;

    const limit = getPlayableLimit(project);
    if (currentTime >= limit - 0.01) {
      if (!project.isUnlocked) return set({ isUnlockModalOpen: true });
      get().setCurrentTime(0);
    }
    sfxEngine.startBgm(true);
    sfxEngine.duckBgm(true);
    set({ isPlaying: true });
  },

  toggleUnlocked: () =>
    set((s) => {
      const isUnlocked = !s.project.isUnlocked;
      renderTimer = clearTimer(renderTimer);
      const canChangeStatus = s.project.status !== "analyzing" && s.project.status !== "idle";
      return {
        project: {
          ...s.project,
          isUnlocked,
          status: canChangeStatus ? (isUnlocked ? "completed" : "preview_ready") : s.project.status,
        },
        renderProgress: isUnlocked ? 100 : 0,
      };
    }),

  openUnlockModal: () => set({ isPlaying: false, isUnlockModalOpen: true }),
  closeUnlockModal: () => set({ isUnlockModalOpen: false }),

  completePurchase: (planId) => {
    const plan = getPlan(planId);
    set((s) => ({
      project: { ...s.project, isUnlocked: true },
      videoCredits: s.videoCredits + (plan.videos - 1),
    }));
    get().startRender();
    const { project, currentTime } = get();
    if (currentTime >= PREVIEW_LIMIT_SEC - 0.01 && currentTime < project.audioDurationSec) {
      set({ isPlaying: true });
    }
  },

  startRender: () => {
    renderTimer = clearTimer(renderTimer);
    set((s) => ({ project: { ...s.project, status: "rendering_full" }, renderProgress: 0 }));
    renderTimer = setInterval(() => {
      const next = Math.min(100, get().renderProgress + 4 + Math.random() * 6);
      if (next >= 100) {
        renderTimer = clearTimer(renderTimer);
        set((s) => ({ project: { ...s.project, status: "completed" }, renderProgress: 100 }));
      } else {
        set({ renderProgress: next });
      }
    }, 350);
  },

  simulateUpload: (input = {}) => {
    analysisTimer = clearTimer(analysisTimer);
    renderTimer = clearTimer(renderTimer);

    const durationSec = Math.round(clamp(input.durationSec ?? DEFAULT_AUDIO_DURATION_SEC, 4, 3600));
    const title = input.fileName ? input.fileName.replace(/\.[^.]+$/, "") : "Untitled audio project";

    set({
      project: {
        id: `proj_${Date.now().toString(36)}`,
        title,
        audioDurationSec: durationSec,
        status: "analyzing",
        isUnlocked: false,
        expiresAt: newExpiry(),
        scenes: [],
        audioUrl: null,
        audioFileName: input.fileName || null,
      },
      selectedSceneId: null,
      currentTime: 0,
      isPlaying: false,
      analysisProgress: 0,
      analysisStage: stageFor(0),
      renderProgress: 0,
    });

    analysisTimer = setInterval(() => {
      const next = Math.min(100, get().analysisProgress + 3 + Math.random() * 5);
      if (next < 100) {
        set({ analysisProgress: next, analysisStage: stageFor(next) });
        return;
      }
      analysisTimer = clearTimer(analysisTimer);
      const scenes = generateMockScenes(durationSec);
      set((s) => ({
        analysisProgress: 100,
        analysisStage: "Done",
        selectedSceneId: scenes[0]?.id ?? null,
        currentTime: 0,
        project: { ...s.project, scenes, status: "preview_ready" },
      }));
    }, 140);
  },

  /**
   * Real Audio Upload: connects real .mp3/.wav/.m4a, creates object URL,
   * and queries the Edge Gemini AI route (/api/analyze-audio).
   */
  uploadRealAudio: async (file: File, durationSec: number) => {
    analysisTimer = clearTimer(analysisTimer);
    renderTimer = clearTimer(renderTimer);

    const audioUrl = URL.createObjectURL(file);
    const cleanDuration = Math.max(4, Math.round(durationSec));
    const title = file.name.replace(/\.[^.]+$/, "");

    set({
      project: {
        id: `proj_${Date.now().toString(36)}`,
        title,
        audioDurationSec: cleanDuration,
        status: "analyzing",
        isUnlocked: false,
        expiresAt: newExpiry(),
        scenes: [],
        audioUrl,
        audioFileName: file.name,
      },
      selectedSceneId: null,
      currentTime: 0,
      isPlaying: false,
      analysisProgress: 15,
      analysisStage: "Analyzing audio waveforms & transcribing…",
      renderProgress: 0,
    });

    // Start progress ticker while API executes
    const interval = setInterval(() => {
      const cur = get().analysisProgress;
      if (cur < 85) {
        set({ analysisProgress: cur + 4, analysisStage: stageFor(cur + 4) });
      }
    }, 200);

    try {
      const apiKey = get().geminiApiKey;
      const res = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          durationSec: cleanDuration,
          apiKey: apiKey || undefined,
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const scenes: SceneNode[] = data.scenes || generateMockScenes(cleanDuration);

      set((s) => ({
        analysisProgress: 100,
        analysisStage: "Storyboard ready!",
        selectedSceneId: scenes[0]?.id ?? null,
        currentTime: 0,
        project: {
          ...s.project,
          title: data.title || title,
          audioDurationSec: cleanDuration,
          scenes,
          status: "preview_ready",
        },
      }));
    } catch {
      clearInterval(interval);
      // Fallback generator seamlessly kicks in
      const scenes = generateMockScenes(cleanDuration);
      set((s) => ({
        analysisProgress: 100,
        analysisStage: "Storyboard ready (fallback)",
        selectedSceneId: scenes[0]?.id ?? null,
        currentTime: 0,
        project: {
          ...s.project,
          scenes,
          status: "preview_ready",
        },
      }));
    }
  },
}));

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export const selectSelectedScene = (s: StudioState): SceneNode | undefined => {
  const id = s.selectedSceneId;
  return id ? s.project.scenes.find((sc) => sc.id === id) : undefined;
};

export const selectIsPaywalled = (s: StudioState): boolean =>
  !s.project.isUnlocked &&
  s.project.scenes.length > 0 &&
  s.project.audioDurationSec > PREVIEW_LIMIT_SEC &&
  s.currentTime >= PREVIEW_LIMIT_SEC;
