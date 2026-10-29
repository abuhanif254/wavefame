/** Free preview window (seconds) before the paywall kicks in. */
export const PREVIEW_LIMIT_SEC = 30;

/** Every visual scene is a rapid 2-second cut. */
export const SCENE_DURATION_SEC = 2;

/** Length of the pre-loaded demo project's audio (20 minutes). */
export const DEFAULT_AUDIO_DURATION_SEC = 20 * 60;

/** Uploaded media is deleted 24h after creation (we show 23h 59m 59s on first paint). */
export const STORAGE_TTL_MS = 24 * 60 * 60 * 1000 - 1000;

export const BRAND_NAME = "Waveframe";
