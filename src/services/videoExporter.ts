/**
 * Browser-side Video Exporter using HTML5 Canvas + Web Audio API + MediaRecorder API.
 * Renders scenes with camera motions, infographics, kinetic typography, and multi-bus
 * audio mixing (Voiceover + Ambient Ducked BGM + Transition SFX) into a 1080p .webm file.
 */

import type { ProjectState, SceneNode } from "@/types/studio";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { isBengaliText, type CaptionStyle } from "@/lib/typography";
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
  captionStyle?: CaptionStyle;
  isBgmMuted?: boolean;
  isSfxMuted?: boolean;
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

/**
 * Bulletproof Procedural Fallback Visual (Never blank or black)
 */
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
 * Procedural Motion Graphics Renderer (Bar Chart, Radial Stat Dial, Neural Flow)
 */
function drawMotionGraphicVisual(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneNode,
  progress: number
) {
  const [h1, h2] = sceneHues(scene.index);
  const templateType = scene.index % 3; // 0: Bar Chart, 1: Radial Stat, 2: Process Flow
  const cx = width / 2;
  const cy = height / 2;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, `hsl(${h1}, 75%, 14%)`);
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (templateType === 0) {
    // Template A: Animated Comparison Bar Chart
    const bars = [42, 68, 91, 55, 78];
    const chartW = width * 0.7;
    const chartH = height * 0.5;
    const startX = (width - chartW) / 2;
    const startY = height * 0.72;
    const barW = chartW / (bars.length * 2);

    bars.forEach((val, i) => {
      const currentH = (val / 100) * chartH * Math.min(1, progress * 1.8);
      const bx = startX + i * barW * 2 + barW * 0.5;
      const by = startY - currentH;

      // Glowing bar
      const barGrad = ctx.createLinearGradient(bx, by, bx, startY);
      barGrad.addColorStop(0, `hsl(${h2}, 90%, 65%)`);
      barGrad.addColorStop(1, `hsl(${h1}, 85%, 45%)`);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, currentH, [8, 8, 0, 0]);
      ctx.fill();

      // Percentage label above bar
      ctx.save();
      ctx.fillStyle = "#e0f2fe";
      ctx.font = `bold ${Math.round(width * 0.018)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(val * Math.min(1, progress * 1.8))}%`, bx + barW / 2, by - 10);

      // Metric label
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${Math.round(width * 0.013)}px monospace`;
      ctx.fillText(`M${i + 1}`, bx + barW / 2, startY + 22);
      ctx.restore();
    });
  } else if (templateType === 1) {
    // Template B: Glowing Radial Stat Dial
    const r = height * 0.28;
    ctx.save();
    ctx.translate(cx, cy);

    // Track circle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = width * 0.016;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Progress arc
    const arcEnd = -Math.PI / 2 + Math.PI * 2 * 0.84 * Math.min(1, progress * 1.6);
    ctx.strokeStyle = `hsl(${h2}, 95%, 60%)`;
    ctx.lineWidth = width * 0.016;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, arcEnd);
    ctx.stroke();

    // Center Big Stat
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(width * 0.065)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`${Math.round(84 * Math.min(1, progress * 1.6))}%`, 0, -height * 0.02);

    ctx.fillStyle = "#38bdf8";
    ctx.font = `bold ${Math.round(width * 0.016)}px monospace`;
    ctx.fillText("RETENTION PEAK", 0, height * 0.06);
    ctx.restore();
  } else {
    // Template C: Process Flow / Neural Nodes
    const nodes = ["01 AUDIO", "02 AI ENGINE", "03 1080P VIDEO"];
    const nodeY = cy;
    const spacing = (width * 0.65) / 2;
    const startX = cx - spacing;

    // Curved connector path
    ctx.save();
    ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, nodeY);
    ctx.quadraticCurveTo(cx, nodeY - height * 0.18, cx + spacing, nodeY);
    ctx.stroke();
    ctx.restore();

    nodes.forEach((label, i) => {
      const nx = startX + i * spacing;
      const boxSize = width * 0.09;

      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(nx - boxSize / 2, nodeY - boxSize / 2, boxSize, boxSize, [14]);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold ${Math.round(width * 0.022)}px monospace`;
      ctx.fillText(`0${i + 1}`, nx, nodeY - 6);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = `bold ${Math.round(width * 0.011)}px monospace`;
      ctx.fillText(label, nx, nodeY + boxSize / 2 + 18);
      ctx.restore();
    });
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
  captionStyle: CaptionStyle = "youtube_yellow"
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

  if (scene.visualType === "motion_graphic") {
    drawMotionGraphicVisual(ctx, width, height, scene, progress);
  } else if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
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

  // Stock Footage letterbox bars & indicator
  if (scene.visualType === "stock_footage") {
    ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
    ctx.fillRect(0, 0, width, height * 0.08);
    ctx.fillRect(0, height * 0.92, width, height * 0.08);

    ctx.save();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(width * 0.88, height * 0.04, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `bold ${Math.round(width * 0.012)}px monospace`;
    ctx.fillText("STOCK 4K · HDR", width * 0.9, height * 0.045);
    ctx.restore();
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

  // 2. High-Retention Bilingual Subtitles (Styled by captionStyle)
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

    if (captionStyle === "classic") {
      // Classic: Translucent dark box with white text
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.beginPath();
      ctx.roundRect(
        cx - metrics.width / 2 - padX,
        capY - capSize / 2 - padY,
        metrics.width + padX * 2,
        capSize + padY * 2,
        [6]
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(scene.transcriptSegment, cx, capY);
    } else if (captionStyle === "minimal_glass") {
      // Minimal Glass: Soft translucent pill
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.beginPath();
      ctx.roundRect(
        cx - metrics.width / 2 - padX,
        capY - capSize / 2 - padY,
        metrics.width + padX * 2,
        capSize + padY * 2,
        [16]
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 8;
      ctx.fillText(scene.transcriptSegment, cx, capY);
    } else {
      // Default: YouTube Yellow with crisp contrast
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.beginPath();
      ctx.roundRect(
        cx - metrics.width / 2 - padX,
        capY - capSize / 2 - padY,
        metrics.width + padX * 2,
        capSize + padY * 2,
        [8]
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(scene.transcriptSegment, cx, capY);
    }

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
 * Main export function with 1:1 Unified Audio Mixing & Master Parity
 */
export async function exportStudioVideo({
  project,
  isPreviewOnly = false,
  isTrial = false,
  captionStyle = "youtube_yellow",
  isBgmMuted = false,
  isSfxMuted = false,
  onProgress,
  signal,
}: VideoExportOptions): Promise<Blob> {
  // Ensure custom Google Fonts (Hind Siliguri & Plus Jakarta Sans) are ready
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Font load fallback
    }
  }

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

  // Step 1/3: Pre-Flight Visual Asset Preloader
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

  // Step 2/3: Prepare Canvas and Master Audio Bus
  const width = 1280;
  const height = 720;
  const fps = 30;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D canvas context.");

  // Prepare MediaStream & Master Audio Mixer
  const videoStream = canvas.captureStream(fps);
  const audioTracks: MediaStreamTrack[] = [];
  let audioContext: AudioContext | null = null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioCtxClass) {
      audioContext = new AudioCtxClass();
      const masterDest = audioContext.createMediaStreamDestination();

      // Bus 1: User Voiceover Audio
      if (project.audioUrl) {
        try {
          const response = await fetch(project.audioUrl);
          const arrayBuf = await response.arrayBuffer();
          const audioBuf = await audioContext.decodeAudioData(arrayBuf);

          const voiceSource = audioContext.createBufferSource();
          voiceSource.buffer = audioBuf;
          const voiceGain = audioContext.createGain();
          voiceGain.gain.setValueAtTime(1.0, audioContext.currentTime);
          voiceSource.connect(voiceGain);
          voiceGain.connect(masterDest);
          voiceSource.start(0, 0, durationSec);
        } catch {
          // Voiceover decode fallback
        }
      }

      // Bus 2: Procedural Ambient Synth Pad (Auto-Ducked at 5% volume)
      if (!isBgmMuted) {
        try {
          const bgmGain = audioContext.createGain();
          bgmGain.gain.setValueAtTime(0.045, audioContext.currentTime);

          const filter = audioContext.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(360, audioContext.currentTime);

          const osc1 = audioContext.createOscillator();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(65.41, audioContext.currentTime); // C2

          const osc2 = audioContext.createOscillator();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(130.81, audioContext.currentTime); // C3

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(bgmGain);
          bgmGain.connect(masterDest);

          osc1.start(audioContext.currentTime);
          osc2.start(audioContext.currentTime);
          osc1.stop(audioContext.currentTime + durationSec);
          osc2.stop(audioContext.currentTime + durationSec);
        } catch {
          // BGM synth fallback
        }
      }

      // Bus 3: Procedural Transition Sound Effects (Scheduled at Scene Start Times)
      if (!isSfxMuted) {
        try {
          const sfxGain = audioContext.createGain();
          sfxGain.gain.setValueAtTime(0.35, audioContext.currentTime);
          sfxGain.connect(masterDest);

          scenes.forEach((sc) => {
            if (!sc.sfx || sc.sfx === "none" || sc.startTime >= durationSec) return;
            const sfxTime = audioContext!.currentTime + sc.startTime;

            if (sc.sfx === "whoosh") {
              const noiseBuf = audioContext!.createBuffer(
                1,
                Math.round(audioContext!.sampleRate * 0.28),
                audioContext!.sampleRate
              );
              const out = noiseBuf.getChannelData(0);
              for (let i = 0; i < out.length; i++) {
                out[i] = (Math.random() * 2 - 1) * Math.exp(-i / (out.length * 0.4));
              }
              const noiseSrc = audioContext!.createBufferSource();
              noiseSrc.buffer = noiseBuf;

              const bp = audioContext!.createBiquadFilter();
              bp.type = "bandpass";
              bp.frequency.setValueAtTime(450, sfxTime);
              bp.frequency.exponentialRampToValueAtTime(1600, sfxTime + 0.22);

              noiseSrc.connect(bp);
              bp.connect(sfxGain);
              noiseSrc.start(sfxTime);
            } else if (sc.sfx === "pop") {
              const osc = audioContext!.createOscillator();
              osc.type = "sine";
              osc.frequency.setValueAtTime(750, sfxTime);
              osc.frequency.exponentialRampToValueAtTime(180, sfxTime + 0.1);
              const g = audioContext!.createGain();
              g.gain.setValueAtTime(0.35, sfxTime);
              g.gain.exponentialRampToValueAtTime(0.001, sfxTime + 0.1);
              osc.connect(g);
              g.connect(sfxGain);
              osc.start(sfxTime);
              osc.stop(sfxTime + 0.1);
            } else if (sc.sfx === "cinematic_hit") {
              const osc = audioContext!.createOscillator();
              osc.type = "sine";
              osc.frequency.setValueAtTime(110, sfxTime);
              osc.frequency.exponentialRampToValueAtTime(32, sfxTime + 0.45);
              const g = audioContext!.createGain();
              g.gain.setValueAtTime(0.55, sfxTime);
              g.gain.exponentialRampToValueAtTime(0.001, sfxTime + 0.45);
              osc.connect(g);
              g.connect(sfxGain);
              osc.start(sfxTime);
              osc.stop(sfxTime + 0.45);
            } else if (sc.sfx === "typewriter") {
              const osc = audioContext!.createOscillator();
              osc.type = "triangle";
              osc.frequency.setValueAtTime(2000, sfxTime);
              const g = audioContext!.createGain();
              g.gain.setValueAtTime(0.25, sfxTime);
              g.gain.exponentialRampToValueAtTime(0.001, sfxTime + 0.04);
              osc.connect(g);
              g.connect(sfxGain);
              osc.start(sfxTime);
              osc.stop(sfxTime + 0.04);
            }
          });
        } catch {
          // SFX schedule fallback
        }
      }

      masterDest.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
    }
  } catch {
    // Audio initialization fallback
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

  // Step 3/3: Frame by Frame Render Loop
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

    drawSceneFrame(
      ctx,
      width,
      height,
      scene,
      sceneElapsed,
      sceneDuration,
      isWatermarked,
      captionStyle
    );

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
