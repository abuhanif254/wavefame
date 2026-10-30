"""
Waveframe Cloud Render Queue Daemon (Worker)
Runs 24/7 on Google Colab Pro (NVIDIA GPU), Linux VPS, or local workstation.
Polls Supabase for queued projects, renders 1080p MP4s via FFmpeg, and uploads to Cloudflare R2.
"""

import argparse
import sys
import time
import traceback
from pathlib import Path
from engine.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    USE_NVENC,
    TEMP_DIR,
    OUTPUT_DIR,
)
from engine.storage import download_audio_file, upload_video_file
from engine.renderer import render_project_to_mp4


def get_supabase_client():
    """Initializes and returns Supabase client."""
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in environment."
        )
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def process_single_project(project_data: dict, supabase_client=None):
    """Renders a single project end-to-end and uploads the result."""
    project_id = str(project_data["id"])
    title = project_data.get("title", "Untitled Project")
    print(f"\n[Worker] 🚀 Processing Project: {project_id} ('{title}')")

    def report_progress(pct: int, stage: str):
        print(f"  [{project_id[:8]}] {pct:3d}% — {stage}")
        if supabase_client:
            try:
                supabase_client.table("projects").update({
                    "render_progress": pct,
                    "render_stage": stage,
                }).eq("id", project_id).execute()
            except Exception as e:
                print(f"  [Worker] Warning updating progress in Supabase: {e}")

    try:
        report_progress(5, "Acquired project job. Initializing worker pipeline...")

        # Step 1: Download Audio if available
        audio_url = project_data.get("audio_storage_url") or project_data.get("audio_url")
        local_audio_path = None
        if audio_url:
            report_progress(8, "Downloading master audio stream...")
            dest_audio = TEMP_DIR / f"voice_{project_id}.mp3"
            try:
                local_audio_path = download_audio_file(audio_url, dest_audio)
            except Exception as e:
                print(f"  [Worker] Audio download notice ({e}). Continuing with synthesized audio.")

        # Step 2: Render 1080p MP4
        output_mp4 = OUTPUT_DIR / f"{project_id}.mp4"
        caption_style = project_data.get("captionStyle") or project_data.get("caption_style") or "youtube_yellow"

        render_project_to_mp4(
            project=project_data,
            voiceover_path=local_audio_path,
            output_path=output_mp4,
            caption_style=caption_style,
            is_watermarked=False,
            progress_callback=report_progress,
        )

        # Step 3: Upload to Cloudflare R2 / Supabase Storage
        report_progress(96, "Uploading 1080p MP4 to high-speed cloud storage...")
        download_url = upload_video_file(output_mp4, project_id)

        # Step 4: Mark Complete in Supabase
        report_progress(100, "Rendering complete! Master video is ready for download.")
        if supabase_client:
            supabase_client.table("projects").update({
                "render_status": "completed",
                "render_progress": 100,
                "render_stage": "Complete. 1080p MP4 is ready.",
                "video_download_url": download_url,
                "render_error": None,
            }).eq("id", project_id).execute()

        print(f"[Worker] ✅ Successfully completed project {project_id}!")
        print(f"[Worker] 🔗 Video URL: {download_url}\n")

    except Exception as err:
        err_msg = f"{type(err).__name__}: {str(err)}"
        print(f"[Worker] ❌ Error rendering project {project_id}: {err_msg}")
        traceback.print_exc()

        if supabase_client:
            try:
                supabase_client.table("projects").update({
                    "render_status": "failed",
                    "render_error": err_msg,
                    "render_stage": "Render failed. Please retry.",
                }).eq("id", project_id).execute()
            except Exception as sub_err:
                print(f"  [Worker] Failed to record error state in Supabase: {sub_err}")


def run_daemon_loop(poll_interval: int = 4):
    """Continuously polls Supabase for queued projects."""
    print("=" * 70)
    print("  Waveframe High-Speed Video Render Worker Daemon")
    print(f"  Hardware: {'NVIDIA GPU (NVENC Accelerated)' if USE_NVENC else 'Multi-Core CPU (libx264)'}")
    print(f"  Supabase Endpoint: {SUPABASE_URL or 'NOT CONFIGURED'}")
    print("=" * 70)

    supabase = get_supabase_client()
    consecutive_empty_polls = 0

    while True:
        try:
            # Query for next unlocked project queued for rendering
            res = (
                supabase.table("projects")
                .select("*")
                .eq("render_status", "queued")
                .eq("is_unlocked", True)
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )

            jobs = res.data or []
            if jobs:
                consecutive_empty_polls = 0
                job = jobs[0]
                # Lock job
                supabase.table("projects").update({
                    "render_status": "rendering",
                    "render_progress": 2,
                    "render_stage": "Worker assigned job...",
                }).eq("id", job["id"]).execute()

                process_single_project(job, supabase)
            else:
                consecutive_empty_polls += 1
                if consecutive_empty_polls % 15 == 0:
                    print(f"[Worker] 💤 Idle — Waiting for queued projects... (Poll every {poll_interval}s)")

        except KeyboardInterrupt:
            print("\n[Worker] Graceful shutdown requested. Exiting daemon.")
            sys.exit(0)
        except Exception as e:
            print(f"[Worker] Polling exception: {e}")
            time.sleep(2)

        time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="Waveframe Video Render Worker")
    parser.add_argument("--project-id", help="Manually render a specific project by UUID")
    parser.add_argument("--demo", action="store_true", help="Run a test render on a synthetic demo project")
    parser.add_argument("--poll-interval", type=int, default=4, help="Polling interval in seconds")
    args = parser.parse_args()

    if args.demo:
        print("[Worker] Running synthetic demo test render (10 seconds)...")
        demo_project = {
            "id": "demo-test-001",
            "title": "Waveframe Synthetic Engine Test",
            "audioDurationSec": 10,
            "scenes": [
                {
                    "id": "scene-0000",
                    "index": 0,
                    "startTime": 0,
                    "endTime": 3,
                    "transcriptSegment": "Welcome to Waveframe GPU Video Engine.",
                    "onScreenText": "GPU RENDER ENGINE",
                    "visualType": "motion_graphic",
                    "cameraEffect": "zoom_in_slow",
                    "sfx": "cinematic_hit",
                },
                {
                    "id": "scene-0001",
                    "index": 1,
                    "startTime": 3,
                    "endTime": 6,
                    "transcriptSegment": "Synthesizing 1080p motion graphic data charts.",
                    "onScreenText": "84% RETENTION",
                    "visualType": "motion_graphic",
                    "cameraEffect": "punch_in_fast",
                    "sfx": "whoosh",
                },
                {
                    "id": "scene-0002",
                    "index": 2,
                    "startTime": 6,
                    "endTime": 10,
                    "transcriptSegment": "High-fidelity bilingual typography and audio mixing.",
                    "onScreenText": "1080P MASTER READY",
                    "visualType": "stock_footage",
                    "cameraEffect": "pan_left",
                    "sfx": "pop",
                },
            ],
        }
        process_single_project(demo_project)
        return

    if args.project_id:
        supabase = get_supabase_client()
        res = supabase.table("projects").select("*").eq("id", args.project_id).single().execute()
        if res.data:
            process_single_project(res.data, supabase)
        else:
            print(f"[Worker] Project {args.project_id} not found in Supabase.")
        return

    # Default: Run continuous queue daemon
    run_daemon_loop(poll_interval=args.poll_interval)


if __name__ == "__main__":
    main()
