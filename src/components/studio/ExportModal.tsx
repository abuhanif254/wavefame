"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Cpu,
  Download,
  ExternalLink,
  FileCode,
  Film,
  Loader2,
  Lock,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { PREVIEW_LIMIT_SEC } from "@/lib/constants";
import { downloadProjectManifest } from "@/lib/export";
import { formatClock } from "@/lib/utils";
import {
  downloadVideoBlob,
  exportStudioVideo,
  type ExportProgress,
} from "@/services/videoExporter";
import { useAuthStore } from "@/lib/auth/authStore";
import { useStudioStore } from "@/store/useStudioStore";

interface CloudRenderState {
  status: "idle" | "queued" | "rendering" | "completed" | "failed";
  progress: number;
  stage: string;
  downloadUrl: string | null;
  error: string | null;
}

export function ExportModal() {
  const isOpen = useStudioStore((s) => s.isExportModalOpen);
  const close = useStudioStore((s) => s.closeExportModal);
  const project = useStudioStore((s) => s.project);
  const isUnlocked = useStudioStore((s) => s.project.isUnlocked);
  const openUnlockModal = useStudioStore((s) => s.openUnlockModal);
  const captionStyle = useStudioStore((s) => s.captionStyle);
  const isBgmMuted = useStudioStore((s) => s.isBgmMuted);
  const isSfxMuted = useStudioStore((s) => s.isSfxMuted);

  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const consumeFreeTrial = useAuthStore((s) => s.consumeFreeTrial);

  // Browser-side export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"preview" | "trial" | "master">("preview");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cloud GPU Engine state
  const [cloudRender, setCloudRender] = useState<CloudRenderState>({
    status: "idle",
    progress: 0,
    stage: "",
    downloadUrl: null,
    error: null,
  });
  const [isEnqueuing, setIsEnqueuing] = useState(false);

  // Poll Cloud Render Status when active
  useEffect(() => {
    if (!isOpen || (cloudRender.status !== "queued" && cloudRender.status !== "rendering")) {
      return;
    }

    let isMounted = true;
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/render/status?projectId=${project.id}`);
        if (!res.ok) return;
        const data = await res.json();

        if (isMounted && data.success) {
          const status = data.renderStatus || "idle";
          setCloudRender((prev) => ({
            ...prev,
            status,
            progress: data.renderProgress ?? prev.progress,
            stage: data.renderStage || prev.stage,
            downloadUrl: data.videoDownloadUrl || prev.downloadUrl,
            error: data.renderError || null,
          }));
        }
      } catch {
        // Retry next poll
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, cloudRender.status, project.id]);

  if (!isOpen) return null;

  const hasUsedTrial = user?.has_used_free_trial ?? false;

  // Cloud GPU Enqueue Handler
  const handleEnqueueCloudGPU = async () => {
    setIsEnqueuing(true);
    setCloudRender({
      status: "queued",
      progress: 2,
      stage: "Connecting to Cloud GPU render queue...",
      downloadUrl: null,
      error: null,
    });

    try {
      const res = await fetch("/api/render/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          projectData: project,
          captionStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enqueue project.");
      }

      setCloudRender((prev) => ({
        ...prev,
        status: "queued",
        stage: "Enqueued. Waiting for GPU Worker to pick up...",
      }));
    } catch (err: unknown) {
      setCloudRender({
        status: "failed",
        progress: 0,
        stage: "Failed to queue job.",
        downloadUrl: null,
        error: (err as Error)?.message || "Failed to reach render queue.",
      });
    } finally {
      setIsEnqueuing(false);
    }
  };

  // Browser-Side MediaRecorder Export
  const handleStartBrowserExport = async (mode: "preview" | "trial" | "master") => {
    setIsExporting(true);
    setExportMode(mode);
    setDownloadReady(false);

    let totalDuration = project.audioDurationSec;
    if (mode === "preview") totalDuration = Math.min(PREVIEW_LIMIT_SEC, project.audioDurationSec);
    if (mode === "trial") totalDuration = Math.min(60, project.audioDurationSec);

    setProgress({
      percent: 0,
      currentSec: 0,
      totalSec: totalDuration,
      stage: "rendering",
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await exportStudioVideo({
        project,
        isPreviewOnly: mode === "preview",
        isTrial: mode === "trial",
        captionStyle,
        isBgmMuted,
        isSfxMuted,
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      });

      downloadVideoBlob(blob, project.title, mode);
      setDownloadReady(true);

      if (mode === "trial") {
        await consumeFreeTrial();
      }
    } catch (err: unknown) {
      if ((err as Error)?.message !== "Export cancelled by user.") {
        setProgress((prev) => (prev ? { ...prev, stage: "error", error: "Export encountered an issue." } : null));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelBrowserExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    setProgress(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isExporting) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export Video"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/80 animate-modal-in max-h-[90vh] overflow-y-auto"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/15 to-transparent" />

        {!isExporting && (
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <header className="relative">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
            <Download className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">Export Video &amp; Project</h2>
          <p className="mt-1 text-sm text-slate-400">
            Render your animated 2-second cuts, 2x2 AI panels, subtitles, and master audio.
          </p>
        </header>

        {/* 1. Browser Export Progress Screen */}
        {isExporting ? (
          <div className="relative mt-8 py-4 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
            </div>

            {progress?.stage === "preloading" ? (
              <>
                <h3 className="text-base font-semibold text-white">
                  Step 1/2: Preloading Visual Assets ({progress.preloadCount || 0}/{progress.preloadTotal || 0})…
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Pre-fetching 2x2 AI grids &amp; motion graphics into memory.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-white">
                  Step 2/2: Rendering {exportMode === "master" ? "1080p Master Video" : "Video Preview"}… {progress?.percent || 0}%
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {exportMode === "master" ? "1080p Master (No Watermark)" : "Watermarked Preview"} · {formatClock(progress?.currentSec || 0)} / {formatClock(progress?.totalSec || 0)}
                </p>
              </>
            )}

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-150"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>

            <button
              onClick={handleCancelBrowserExport}
              className="mt-6 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Cancel rendering
            </button>
          </div>
        ) : downloadReady ? (
          <div className="relative mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Browser Video Exported!</h3>
            <p className="mt-1 text-xs text-slate-300">
              {exportMode === "master"
                ? "Full 1080p Master WebM video downloaded."
                : exportMode === "trial"
                ? "1-Minute Free Trial export completed and saved."
                : "30-second preview clip downloaded."}
            </p>
            <button
              onClick={() => {
                setDownloadReady(false);
                close();
              }}
              className="mt-5 rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="relative mt-6 space-y-3.5">
            {/* UNLOCKED USERS: DUAL PIPELINE OPTIONS */}
            {isUnlocked ? (
              <>
                {/* Option 1A: Cloud GPU Engine (1080p .MP4 via Python + Colab Worker) */}
                <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-slate-950/80 p-4 shadow-lg shadow-indigo-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/40">
                        <Cloud className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            Cloud GPU Engine (1080p .MP4)
                          </span>
                          <span className="rounded bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-wider">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          NVIDIA GPU NVENC hardware acceleration · 1080p H.264 MP4 with 3-track mastered audio &amp; Cloudflare R2 upload.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Render Active Progress UI */}
                  {cloudRender.status === "queued" || cloudRender.status === "rendering" ? (
                    <div className="mt-4 rounded-xl border border-indigo-500/20 bg-slate-900/90 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2 text-indigo-300">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                          {cloudRender.stage || "Processing render pipeline..."}
                        </span>
                        <span className="font-mono text-white">{cloudRender.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${Math.max(4, cloudRender.progress)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Status: <strong className="text-slate-200 capitalize">{cloudRender.status}</strong></span>
                        <span className="text-indigo-400 font-mono">Auto-refreshes every 3s</span>
                      </div>
                    </div>
                  ) : cloudRender.status === "completed" && cloudRender.downloadUrl ? (
                    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>1080p MP4 Ready for Download!</span>
                      </div>
                      <a
                        href={cloudRender.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-emerald-400 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download 1080p MP4
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : cloudRender.status === "failed" ? (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        <span>Cloud render notice: {cloudRender.error || "Worker unavailable."}</span>
                      </div>
                      <button
                        onClick={handleEnqueueCloudGPU}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition"
                      >
                        Retry Cloud Render
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Format: 1080p MP4 · NVENC H.264
                      </span>
                      <button
                        onClick={handleEnqueueCloudGPU}
                        disabled={isEnqueuing}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
                      >
                        {isEnqueuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        Enqueue 1080p MP4
                      </button>
                    </div>
                  )}
                </div>

                {/* Option 1B: Instant Browser MediaRecorder (.WebM Fallback) */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">Instant Browser Recorder (.WebM)</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                            LOCAL FALLBACK
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Renders on your device via HTML5 Canvas (useful if GPU worker is offline)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartBrowserExport("master")}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export WebM
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* NON-UNLOCKED USERS: UNLOCK CTA */
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Film className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Full 1080p Master Video</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Entire {formatClock(project.audioDurationSec)} runtime · Zero Watermark · 1080p MP4 + WebM
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      close();
                      openUnlockModal();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-400 hover:to-violet-500 transition"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Unlock (৳120)
                  </button>
                </div>
              </div>
            )}

            {/* Option 2: One-Time 1-Minute Free Trial Export */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 transition hover:border-indigo-500/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">1-Minute Free Trial Export</span>
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                        1 Per Account
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Export first 60 seconds with subtle watermark
                    </div>
                  </div>
                </div>

                {!user ? (
                  <button
                    onClick={() => {
                      close();
                      openAuthModal();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Sign In to Claim
                  </button>
                ) : hasUsedTrial ? (
                  <span className="text-[11px] font-medium text-slate-500 border border-slate-800 bg-slate-900 px-2.5 py-1 rounded-md">
                    Trial Used (1/1)
                  </span>
                ) : (
                  <button
                    onClick={() => handleStartBrowserExport("trial")}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Claim 60s
                  </button>
                )}
              </div>
            </div>

            {/* Option 3: 30s Quick Preview Sample */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      30-Second Quick Sample
                    </div>
                    <div className="text-xs text-slate-400">
                      Fast draft export · First {PREVIEW_LIMIT_SEC}s with watermark
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartBrowserExport("preview")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export 30s
                </button>
              </div>
            </div>

            {/* Option 4: EDL JSON Manifest */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-400">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Timeline Decision List (JSON)</div>
                    <div className="text-xs text-slate-400">
                      Raw scene timestamps, camera moves, and prompts
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => downloadProjectManifest(project)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  .edl.json
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
