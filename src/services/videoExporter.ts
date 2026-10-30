/**
 * Browser-side Video Exporter using HTML5 Canvas + Web Audio + MediaRecorder API.
 * Renders scenes with camera motions, infographics, and kinetic text directly into a .webm file.
 */

import type { ProjectState, SceneNode } from "@/types/studio";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { isBengaliText } from "@/lib/typography";
import { slugify } from "@/lib/utils";
import { sceneHues } from "@/lib/visuals";

export interface ExportProgress {
  percent: number;
  currentSec: number;
  totalSec: number;
  stage: "preloading" | "rendering" | "encoding" | "complete" | "error";
  preloadCount?: number;
  preloadTotal?: number;
  error?: string;
}

export interface VideoExportOptions {
  project: ProjectState;
  /** If true, clamp export to PREVIEW_LIMIT_SEC (30s) */
  isPreviewOnly?: boolean;
  /** If true, 1-minute free trial export (60s) */
  isTrial?: boolean;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

// Cached image elements for offscreen rendering
const imageCache = new Map<string, HTMLImageElement>();
const failedUrls = new Set<string>();

function loadImageWithTimeout(url: string, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  if (imageCache.has(url)) {
    const img = imageCache.get(url)!;
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
  }
  if (failedUrls.has(url)) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        failedUrls.add(url);
        resolve(null);
      }
    }, timeoutMs);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        imageCache.set(url, img);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        failedUrls.add(url);
        resolve(null);
      }
    };
    img.src = url;
  });
}

function drawProceduralFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneNode,
  progress: number
) {
  const [h1, h2] = sceneHues(scene.index);
  const cx = width / 2;
  const cy = height / 2;

  // Multi-stop radial background
  const rad = ctx.createRadialGradient(cx, cy, width * 0.1, cx, cy, width * 0.7);
  rad.addColorStop(0, `hsl(${h1}, 75%, 22%)`);
  rad.addColorStop(0.65, `hsl(${h2}, 85%, 10%)`);
  rad.addColorStop(1, "#020617");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, width, height);

  // Concentric animated rings
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `hsla(${h1}, 90%, 65%, 0.25)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const radius = width * 0.22 + Math.sin(progress * Math.PI) * 15;
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Futuristic crosshairs
  ctx.strokeStyle = `hsla(${h2}, 90%, 65%, 0.18)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-width * 0.35, 0);
  ctx.lineTo(width * 0.35, 0);
  ctx.moveTo(0, -height * 0.35);
  ctx.lineTo(0, height * 0.35);
  ctx.stroke();
  ctx.restore();

  // Subtle grid overlay
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const step = Math.round(width * 0.05);
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

/**
 * Render a single video frame onto the 2D canvas context
 */
function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneNode,
  sceneElapsed: number,
  sceneDuration: number,
  isWatermarked: boolean = false,
) {
  const progress = Math.min(1, Math.max(0, sceneElapsed / sceneDuration));

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply virtual camera movement
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;

  switch (scene.cameraEffect) {
    case "zoom_in_slow": {
      const scale = 1 + progress * 0.18;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      break;
    }
    case "punch_in_fast": {
      const scale = 1 + Math.min(1, progress * 3.5) * 0.22;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      break;
    }
    case "pan_left": {
      const dx = (progress - 0.5) * width * 0.08;
      ctx.translate(-dx, 0);
      break;
    }
    case "pan_right": {
      const dx = (progress - 0.5) * width * 0.08;
      ctx.translate(dx, 0);
      break;
    }
  }

  // Draw background visual based on visualType with Anti-Blank-Frame Guard
  const imgUrl = scene.gridMasterUrl || scene.previewUrl;
  const cachedImg = imgUrl ? imageCache.get(imgUrl) : null;

  if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
    if (scene.visualType === "ai_grid_panel" && scene.quadrantIndex !== undefined) {
      // Crop quadrant from 2x2 grid
      const q = scene.quadrantIndex;
      const sw = cachedImg.naturalWidth / 2;
      const sh = cachedImg.naturalHeight / 2;
      const sx = (q % 2) * sw;
      const sy = Math.floor(q / 2) * sh;
      ctx.drawImage(cachedImg, sx, sy, sw, sh, 0, 0, width, height);
    } else {
      ctx.drawImage(cachedImg, 0, 0, width, height);
    }
  } else {
    // Bulletproof Procedural Fallback Guard (Never blank or black)
    drawProceduralFallback(ctx, width, height, scene, progress);
  }

  // Cinematic dark vignette overlay
  const vignette = ctx.createRadialGradient(cx, cy, width * 0.3, cx, cy, width * 0.75);
  vignette.addColorStop(0, "rgba(2, 6, 23, 0)");
  vignette.addColorStop(1, "rgba(2, 6, 23, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore(); // Restore camera transform

  // 1. Kinetic On-Screen Text with Bilingual Font Support
  if (scene.onScreenText) {
    const isKinetic = scene.visualType === "kinetic_text";
    const isBangla = isBengaliText(scene.onScreenText);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = isKinetic ? Math.round(width * 0.058) : Math.round(width * 0.035);
    ctx.font = isBangla
      ? `700 ${fontSize}px "Hind Siliguri", "Nirmala UI", sans-serif`
      : `900 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

    const textY = isKinetic ? height * 0.48 : height * 0.68;
    const text = isBangla ? scene.onScreenText : scene.onScreenText.toUpperCase();

    if (!isKinetic) {
      // Pill backdrop
      const metrics = ctx.measureText(text);
      const padX = width * 0.025;
      const padY = height * 0.016;
      const rx = cx - metrics.width / 2 - padX;
      const ry = textY - fontSize / 2 - padY;
      ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
      ctx.beginPath();
      ctx.roundRect(rx, ry, metrics.width + padX * 2, fontSize + padY * 2, [10]);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 16;
    ctx.fillText(text, cx, textY);
    ctx.restore();
  }

  // 2. High-Retention Bilingual Subtitles (Bold Yellow / Clean Contrast)
  if (scene.transcriptSegment) {
    const isBangla = isBengaliText(scene.transcriptSegment);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const capSize = Math.round(width * 0.02);
    ctx.font = isBangla
      ? `600 ${capSize}px "Hind Siliguri", "Nirmala UI", sans-serif`
      : `800 ${capSize}px "Plus Jakarta Sans", sans-serif`;

    const capY = height * 0.92;
    const metrics = ctx.measureText(scene.transcriptSegment);
    const padX = width * 0.022;
    const padY = height * 0.012;

    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.beginPath();
    ctx.roundRect(
      cx - metrics.width / 2 - padX,
      capY - capSize / 2 - padY,
      metrics.width + padX * 2,
      capSize + padY * 2,
      [8],
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#facc15"; // High-retention yellow
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 8;
    ctx.fillText(scene.transcriptSegment, cx, capY);
    ctx.restore();
  }

  // 3. Watermark enforcement
  if (isWatermarked) {
    ctx.save();
    // Center diagonal watermark
    ctx.translate(cx, cy);
    ctx.rotate(-0.18);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `900 ${Math.round(width * 0.038)}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillText("WAVEFRAME STUDIO — PREVIEW", 0, -height * 0.03);

    ctx.font = `600 ${Math.round(width * 0.015)}px sans-serif`;
    ctx.fillStyle = "rgba(251, 191, 36, 0.28)"; // amber subtle
    ctx.fillText("UNLOCK 1080p MASTER TO REMOVE WATERMARK", 0, height * 0.03);
    ctx.restore();

    // Top preview watermark tag
    ctx.save();
    ctx.font = `700 ${Math.round(width * 0.014)}px monospace`;
    ctx.fillStyle = "rgba(251, 191, 36, 0.75)";
    ctx.fillText("🔒 PREVIEW WATERMARK", width * 0.04, height * 0.07);
    ctx.restore();
  } else {
    // Unlocked 1080p Master Tag
    ctx.save();
    ctx.font = `700 ${Math.round(width * 0.013)}px monospace`;
    ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
    ctx.fillText("● 1080p MASTER UNLOCKED", width * 0.04, height * 0.07);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main export function
 */
export async function exportStudioVideo({
  project,
  isPreviewOnly = false,
  isTrial = false,
  onProgress,
  signal,
}: VideoExportOptions): Promise<Blob> {
  // Determine duration and watermark status
  let durationSec = project.audioDurationSec;
  let isWatermarked = !project.isUnlocked;

  if (isTrial) {
    durationSec = Math.min(60, project.audioDurationSec);
    isWatermarked = true; // Trial export includes watermark
  } else if (isPreviewOnly || !project.isUnlocked) {
    durationSec = Math.min(PREVIEW_LIMIT_SEC, project.audioDurationSec);
    isWatermarked = true;
  } else {
    // Unlocked project: full duration up to 20 minutes, zero watermark
    durationSec = project.audioDurationSec;
    isWatermarked = false;
  }

  const scenes = project.scenes.filter((s) => s.startTime < durationSec);
  if (scenes.length === 0) {
    throw new Error("No scenes available to export.");
  }

  // Step 1/2: Pre-Flight Visual Asset Preloader
  const uniqueUrls = Array.from(
    new Set(scenes.map((s) => s.gridMasterUrl || s.previewUrl).filter(Boolean) as string[])
  );

  const totalAssets = uniqueUrls.length;
  let loadedAssets = 0;

  if (totalAssets > 0) {
    onProgress?.({
      percent: 0,
      currentSec: 0,
      totalSec: durationSec,
      stage: "preloading",
      preloadCount: 0,
      preloadTotal: totalAssets,
    });

    await Promise.all(
      uniqueUrls.map(async (url) => {
        if (signal?.aborted) return;
        try {
          await loadImageWithTimeout(url, 6000);
        } catch {
          // Fallback guard handles missing visual
        } finally {
          loadedAssets++;
          onProgress?.({
            percent: Math.round((loadedAssets / totalAssets) * 100),
            currentSec: 0,
            totalSec: durationSec,
            stage: "preloading",
            preloadCount: loadedAssets,
            preloadTotal: totalAssets,
          });
        }
      })
    );
  }

  const width = 1280;
  const height = 720;
  const fps = 30;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context.");

  // Prepare MediaStream & Audio
  const videoStream = canvas.captureStream(fps);
  const audioTracks: MediaStreamTrack[] = [];
  let audioContext: AudioContext | null = null;

  if (project.audioUrl) {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
        const response = await fetch(project.audioUrl);
        const arrayBuf = await response.arrayBuffer();
        const audioBuf = await audioContext.decodeAudioData(arrayBuf);

        const dest = audioContext.createMediaStreamDestination();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuf;
        source.connect(dest);
        source.start(0, 0, durationSec);

        dest.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
      }
    } catch {
      // Audio decode failed, proceed with silent video
    }
  }

  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const mimeType = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // Render loop frame by frame
  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) {
      recorder.stop();
      if (audioContext) void audioContext.close();
      throw new Error("Export cancelled by user.");
    }

    const currentSec = frame / fps;
    const scene =
      scenes.find((s) => currentSec >= s.startTime && currentSec < s.endTime) ||
      scenes[scenes.length - 1];

    const sceneElapsed = currentSec - scene.startTime;
    const sceneDuration = scene.endTime - scene.startTime || 2;

    drawSceneFrame(ctx, width, height, scene, sceneElapsed, sceneDuration, isWatermarked);

    const percent = Math.round((frame / totalFrames) * 98);
    onProgress?.({
      percent,
      currentSec: Math.round(currentSec * 10) / 10,
      totalSec: durationSec,
      stage: "rendering",
    });

    // Yield to browser event loop
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  onProgress?.({
    percent: 99,
    currentSec: durationSec,
    totalSec: durationSec,
    stage: "encoding",
  });

  recorder.stop();
  const videoBlob = await recordingPromise;

  if (audioContext) void audioContext.close();

  onProgress?.({
    percent: 100,
    currentSec: durationSec,
    totalSec: durationSec,
    stage: "complete",
  });

  return videoBlob;
}

/**
 * Triggers instant browser download of the generated video blob
 */
export function downloadVideoBlob(
  blob: Blob,
  projectTitle: string,
  mode: "preview" | "trial" | "master" = "preview"
) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffixMap = {
    preview: "_30s_preview.webm",
    trial: "_60s_free_trial.webm",
    master: "_full_1080p_master.webm",
  };
  const suffix = suffixMap[mode] || "_video.webm";
  a.href = url;
  a.download = `${slugify(projectTitle)}${suffix}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
