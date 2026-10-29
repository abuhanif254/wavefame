/**
 * Browser-side Video Exporter using HTML5 Canvas + Web Audio + MediaRecorder API.
 * Renders scenes with camera motions, infographics, and kinetic text directly into a .webm file.
 */

import type { ProjectState, SceneNode } from "@/types/studio";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { slugify } from "@/lib/utils";

export interface ExportProgress {
  percent: number;
  currentSec: number;
  totalSec: number;
  stage: "rendering" | "encoding" | "complete" | "error";
  error?: string;
}

export interface VideoExportOptions {
  project: ProjectState;
  /** If true, clamp export to PREVIEW_LIMIT_SEC (30s) */
  isPreviewOnly?: boolean;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

// Cached image elements for offscreen rendering
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(url)) {
    const img = imageCache.get(url)!;
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
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

  // Draw background visual based on visualType
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
    // Stylized gradient background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#0b0f19");
    grad.addColorStop(0.5, "#1e1b4b");
    grad.addColorStop(1, "#311042");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (scene.visualType === "motion_graphic") {
      // Draw motion graphic bar chart template
      const barCount = 7;
      const barWidth = width * 0.08;
      const startX = width * 0.18;
      const bottomY = height * 0.72;

      for (let b = 0; b < barCount; b++) {
        const hFactor = 0.3 + 0.5 * Math.sin(b * 1.2 + 1);
        const curHeight = height * 0.45 * hFactor * Math.min(1, progress * 2.2);
        const bx = startX + b * (barWidth * 1.5);
        const by = bottomY - curHeight;

        const bGrad = ctx.createLinearGradient(0, by, 0, bottomY);
        bGrad.addColorStop(0, "#818cf8");
        bGrad.addColorStop(1, "#4f46e5");
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, barWidth, curHeight, [6, 6, 0, 0]);
        ctx.fill();
      }
    } else if (scene.visualType === "ai_grid_panel") {
      // 2x2 grid outline
      ctx.strokeStyle = "rgba(129, 140, 248, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
  }

  // Cinematic dark vignette overlay
  const vignette = ctx.createRadialGradient(cx, cy, width * 0.3, cx, cy, width * 0.75);
  vignette.addColorStop(0, "rgba(2, 6, 23, 0)");
  vignette.addColorStop(1, "rgba(2, 6, 23, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore(); // Restore camera transform

  // 1. Kinetic On-Screen Text
  if (scene.onScreenText) {
    const isKinetic = scene.visualType === "kinetic_text";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = isKinetic ? Math.round(width * 0.062) : Math.round(width * 0.038);
    ctx.font = `900 ${fontSize}px sans-serif`;

    const textY = isKinetic ? height * 0.48 : height * 0.68;
    const text = scene.onScreenText.toUpperCase();

    if (!isKinetic) {
      // Pill backdrop
      const metrics = ctx.measureText(text);
      const padX = width * 0.025;
      const padY = height * 0.02;
      const rx = cx - metrics.width / 2 - padX;
      const ry = textY - fontSize / 2 - padY;
      ctx.fillStyle = "rgba(2, 6, 23, 0.75)";
      ctx.beginPath();
      ctx.roundRect(rx, ry, metrics.width + padX * 2, fontSize + padY * 2, [10]);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 16;
    ctx.fillText(text, cx, textY);
    ctx.restore();
  }

  // 2. Transcript Caption at bottom
  if (scene.transcriptSegment) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const capSize = Math.round(width * 0.019);
    ctx.font = `500 ${capSize}px sans-serif`;

    const capY = height * 0.92;
    const metrics = ctx.measureText(scene.transcriptSegment);
    const padX = width * 0.02;
    const padY = height * 0.012;

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.roundRect(
      cx - metrics.width / 2 - padX,
      capY - capSize / 2 - padY,
      metrics.width + padX * 2,
      capSize + padY * 2,
      [6],
    );
    ctx.fill();

    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(scene.transcriptSegment, cx, capY);
    ctx.restore();
  }

  // 3. Top watermark / time code
  ctx.save();
  ctx.font = `600 ${Math.round(width * 0.015)}px monospace`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillText("WAVEFRAME HD", width * 0.04, height * 0.07);
  ctx.restore();

  ctx.restore();
}

/**
 * Main export function
 */
export async function exportStudioVideo({
  project,
  isPreviewOnly = false,
  onProgress,
  signal,
}: VideoExportOptions): Promise<Blob> {
  const durationSec = isPreviewOnly
    ? Math.min(PREVIEW_LIMIT_SEC, project.audioDurationSec)
    : project.audioDurationSec;

  const scenes = project.scenes.filter((s) => s.startTime < durationSec);
  if (scenes.length === 0) {
    throw new Error("No scenes available to export.");
  }

  // Pre-load images for all scenes in this export window
  for (const sc of scenes) {
    const url = sc.gridMasterUrl || sc.previewUrl;
    if (url) {
      void loadImage(url);
    }
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

    drawSceneFrame(ctx, width, height, scene, sceneElapsed, sceneDuration);

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
export function downloadVideoBlob(blob: Blob, projectTitle: string, isPreviewOnly: boolean) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = isPreviewOnly ? "_30s_preview.webm" : "_full_1080p.webm";
  a.href = url;
  a.download = `${slugify(projectTitle)}${suffix}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
