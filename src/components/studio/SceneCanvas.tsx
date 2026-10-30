"use client";

import { useState, type CSSProperties } from "react";
import type { SceneNode } from "@/types/studio";
import { SCENE_DURATION_SEC } from "@/lib/constants";
import { gradient, hash, sceneGradient, sceneHues } from "@/lib/visuals";
import { useStudioStore } from "@/store/useStudioStore";

const QUADRANT_POSITIONS: Record<0 | 1 | 2 | 3, { pos: string; label: string }> = {
  0: { pos: "0% 0%", label: "Quadrant 1 · Top-Left" },
  1: { pos: "100% 0%", label: "Quadrant 2 · Top-Right" },
  2: { pos: "0% 100%", label: "Quadrant 3 · Bottom-Left" },
  3: { pos: "100% 100%", label: "Quadrant 4 · Bottom-Right" },
};

/**
 * 1. AI Grid Slicer: crops into the exact 2x2 quadrant with background-size: 200% 200%
 */
function AiGridSlicerLayer({ scene }: { scene: SceneNode }) {
  const [imgFailed, setImgFailed] = useState(false);
  const qIndex = (scene.quadrantIndex ?? (scene.index % 4)) as 0 | 1 | 2 | 3;
  const quadrant = QUADRANT_POSITIONS[qIndex];
  const [h1, h2] = sceneHues(scene.index);

  // Use the 2x2 master grid URL if available, or direct Pollinations previewUrl
  const imageUrl = scene.gridMasterUrl || scene.previewUrl;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Background fallback gradient in case image is loading or offline */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, hsl(${h1} 75% 30% / 0.45), hsl(${h2} 80% 10% / 0.95))`,
        }}
      />

      {imageUrl && !imgFailed ? (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: "200% 200%",
            backgroundPosition: quadrant.pos,
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Hidden image element to detect real image load / error */}
          <img
            src={imageUrl}
            alt={scene.imagePrompt}
            className="hidden"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        /* Stylized CSS 2x2 grid panel representation */
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[1%] p-[1%]">
          {[0, 1, 2, 3].map((n) => {
            const isTarget = n === qIndex;
            const [a, b] = sceneHues(scene.index, n);
            return (
              <div
                key={n}
                className="relative overflow-hidden rounded-[0.5cqw] transition-transform"
                style={{
                  background: gradient(a, b, 120 + n * 40),
                  transform: isTarget ? "scale(1.02)" : "scale(0.98)",
                  boxShadow: isTarget ? "0 0 20px rgba(129, 140, 248, 0.4)" : "none",
                }}
              >
                <div className="absolute inset-0 bg-black/20" />
                <span className="absolute bottom-[8%] left-[8%] font-mono text-[1cqw] text-white/80">
                  PANEL {String.fromCharCode(65 + n)} {isTarget ? "● ACTIVE" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cinematic dark vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.75)_100%)]" />

      {/* Slicer quadrant indicator badge */}
      <div className="pointer-events-none absolute bottom-[4%] right-[4%] flex items-center gap-1.5 rounded-md border border-violet-400/30 bg-slate-950/80 px-2 py-1 font-mono text-[1cqw] text-violet-300 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        AI Slicer · {quadrant.label}
      </div>
    </div>
  );
}

/**
 * 2. Rich Motion Graphic Infographics
 */
function MotionGraphicLayer({ scene }: { scene: SceneNode }) {
  const [h1, h2] = sceneHues(scene.index);
  const templateType = scene.index % 3; // 0: Bar Chart, 1: Radial Stat, 2: Process Flow

  if (templateType === 0) {
    // Template A: Animated Comparison Bar Chart
    const bars = [42, 68, 91, 55, 78];
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background: sceneGradient(scene.index) }}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:100%_12%]" />
        <div className="absolute inset-x-[12%] bottom-[15%] top-[18%] flex items-end justify-between gap-[3%]">
          {bars.map((val, idx) => (
            <div key={idx} className="flex flex-1 flex-col items-center h-full justify-end">
              <span className="font-mono text-[1.2cqw] font-bold text-sky-200 mb-1">{val}%</span>
              <div
                className="bar-grow w-full rounded-t-[0.6cqw]"
                style={{
                  height: `${val}%`,
                  animationDelay: `${idx * 80}ms`,
                  background: `linear-gradient(to top, hsl(${h1} 85% 55%), hsl(${h2} 90% 70%))`,
                  boxShadow: `0 0 20px hsl(${h2} 90% 65% / 0.4)`,
                }}
              />
              <span className="font-mono text-[0.9cqw] text-slate-400 mt-1.5">METRIC {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templateType === 1) {
    // Template B: Glowing Radial Stat Dial
    return (
      <div className="relative h-full w-full overflow-hidden flex items-center justify-center" style={{ background: sceneGradient(scene.index, 2) }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.2),transparent_70%)]" />
        <div className="relative flex flex-col items-center">
          <svg className="w-[32cqw] h-[32cqw] -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="hsl(199 89% 60%)"
              strokeWidth="6"
              strokeDasharray="264"
              strokeDashoffset="55"
              strokeLinecap="round"
              className="line-draw"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-black text-[5cqw] tracking-tight text-white drop-shadow">84%</span>
            <span className="font-mono text-[1.1cqw] text-sky-300 uppercase tracking-widest">RETENTION PEAK</span>
          </div>
        </div>
      </div>
    );
  }

  // Template C: Process Flow / Neural Nodes
  return (
    <div className="relative h-full w-full overflow-hidden flex items-center justify-center" style={{ background: sceneGradient(scene.index, 4) }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 225">
        <path d="M 80 112 Q 200 40 320 112" fill="none" stroke="rgba(129,140,248,0.4)" strokeWidth="2.5" strokeDasharray="6 4" />
        <path d="M 80 112 Q 200 185 320 112" fill="none" stroke="rgba(129,140,248,0.4)" strokeWidth="2.5" strokeDasharray="6 4" />
      </svg>
      <div className="relative z-10 flex w-full max-w-[75%] items-center justify-between">
        {["INPUT AUDIO", "AI ENGINE", "1080P VIDEO"].map((node, i) => (
          <div key={node} className="flex flex-col items-center">
            <div className="grid h-[7cqw] w-[7cqw] place-items-center rounded-2xl border border-sky-400/40 bg-slate-900/90 shadow-xl shadow-sky-500/20 backdrop-blur-md">
              <span className="font-mono text-[2cqw] font-bold text-sky-300">0{i + 1}</span>
            </div>
            <span className="mt-2 font-mono text-[1cqw] font-semibold tracking-wider text-slate-300">{node}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. Cinematic Stock Footage Layer
 */
function StockFootageLayer({ scene }: { scene: SceneNode }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [h1, h2] = sceneHues(scene.index, 3);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {scene.previewUrl && !imgFailed ? (
        <img
          src={scene.previewUrl}
          alt={scene.imagePrompt}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="relative h-full w-full" style={{ background: sceneGradient(scene.index, 3) }}>
          <div
            className="drift absolute -left-[10%] top-[10%] h-[70%] w-[60%] rounded-full blur-3xl"
            style={{ background: `hsl(${h2} 90% 62% / 0.45)` }}
          />
          <div
            className="drift absolute -right-[5%] bottom-[0%] h-[60%] w-[50%] rounded-full blur-3xl"
            style={{ background: `hsl(${h1} 85% 60% / 0.4)`, animationDirection: "alternate-reverse" }}
          />
        </div>
      )}

      {/* Cinematic Widescreen Letterbox Bars */}
      <div className="absolute inset-x-0 top-0 h-[8%] bg-slate-950/90" />
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-slate-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.7)_100%)]" />

      <div className="absolute right-[3%] top-[11%] flex items-center gap-[0.6cqw] font-mono text-[1cqw] text-white/80">
        <span className="h-[0.7cqw] w-[0.7cqw] animate-pulse rounded-full bg-red-500" />
        STOCK 4K · HDR
      </div>
    </div>
  );
}

/**
 * 4. Kinetic Typography Canvas Layer
 */
function KineticTextLayer({ scene }: { scene: SceneNode }) {
  const [h1, h2] = sceneHues(scene.index, 5);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: sceneGradient(scene.index, 5) }}>
      <div
        className="spin-slow absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{
          background: `conic-gradient(from 0deg, transparent, hsl(${h2} 90% 65% / 0.7), transparent 40%, hsl(${h1} 90% 60% / 0.6), transparent 80%)`,
          filter: "blur(40px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,6,23,0.7)_100%)]" />
    </div>
  );
}

/**
 * Master visual layer router
 */
function VisualLayer({ scene }: { scene: SceneNode }) {
  switch (scene.visualType) {
    case "ai_grid_panel":
      return <AiGridSlicerLayer scene={scene} />;
    case "motion_graphic":
      return <MotionGraphicLayer scene={scene} />;
    case "stock_footage":
      return <StockFootageLayer scene={scene} />;
    case "kinetic_text":
      return <KineticTextLayer scene={scene} />;
  }
}

interface SceneCanvasProps {
  scene: SceneNode;
  isPlaying: boolean;
}

/**
 * 16:9 Canvas with real-time camera movements, kinetic typography, and subtitles.
 */
export function SceneCanvas({ scene, isPlaying }: SceneCanvasProps) {
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const duration = Math.max(0.5, scene.endTime - scene.startTime) || SCENE_DURATION_SEC;
  const cameraStyle: CSSProperties = {
    animationDuration: `${duration}s`,
    animationIterationCount: isPlaying ? 1 : "infinite",
    animationDirection: isPlaying ? "normal" : "alternate",
  };
  const isKinetic = scene.visualType === "kinetic_text";
  const restartKey = `${scene.id}-${scene.visualType}-${scene.cameraEffect}-${isPlaying}`;

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950">
      <div key={restartKey} className={`cam cam-${scene.cameraEffect} absolute inset-0`} style={cameraStyle}>
        <VisualLayer scene={scene} />
      </div>

      {/* Kinetic on-screen text (not affected by the camera move) */}
      {scene.onScreenText && (
        <div
          className={
            isKinetic
              ? "pointer-events-none absolute inset-0 flex items-center justify-center px-[8%]"
              : "pointer-events-none absolute inset-x-0 bottom-[17%] flex justify-center px-[6%]"
          }
        >
          <div
            key={`${scene.id}-${isPlaying}`}
            className="animate-text-pop text-balance text-center font-black uppercase leading-[1.05] tracking-tight text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.7)]"
            style={{ fontSize: isKinetic ? "clamp(20px, 7.5cqw, 88px)" : "clamp(14px, 4.2cqw, 52px)" }}
          >
            {isKinetic ? (
              scene.onScreenText
            ) : (
              <span className="rounded-[0.6cqw] border border-white/10 bg-slate-950/70 px-[1.6cqw] py-[0.6cqw] backdrop-blur-md">
                {scene.onScreenText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Transcript caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[3%] flex justify-center px-[6%]">
        <span
          className="max-w-full truncate rounded-[0.5cqw] border border-white/10 bg-black/70 px-[1.2cqw] py-[0.4cqw] text-slate-100 backdrop-blur-md"
          style={{ fontSize: "clamp(9px, 1.6cqw, 18px)" }}
        >
          {scene.transcriptSegment}
        </span>
      </div>

      {/* Semi-transparent Watermark overlay on locked preview */}
      {!isUnlocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <div className="-rotate-12 transform rounded-2xl border-2 border-dashed border-white/30 bg-slate-950/50 px-6 py-3 text-center shadow-2xl backdrop-blur-[2px]">
            <div className="font-mono text-[2.6cqw] font-black tracking-widest text-white/75 uppercase drop-shadow">
              Waveframe Studio — Preview
            </div>
            <div className="text-[1.1cqw] font-mono tracking-wider text-amber-300/80">
              🔒 30s PREVIEW WATERMARK · UNLOCK FOR 1080p MASTER
            </div>
          </div>
        </div>
      )}

      {/* Top status indicator: Unlocked 1080p Master vs Watermarked Preview */}
      {isUnlocked ? (
        <div className="pointer-events-none absolute left-[3%] top-[4%] flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-slate-950/80 px-2 py-1 font-mono text-[1cqw] text-emerald-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          1080p MASTER · UNLOCKED
        </div>
      ) : (
        <div className="pointer-events-none absolute left-[3%] top-[4%] flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-slate-950/80 px-2 py-1 font-mono text-[1cqw] text-amber-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          PREVIEW WATERMARKED
        </div>
      )}
    </div>
  );
}
