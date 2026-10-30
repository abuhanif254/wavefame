"""
Master Video Renderer for Waveframe Engine
Feeds high-speed raw RGB24 frames directly into an FFmpeg NVENC/CPU pipe.
"""

import subprocess
import time
from pathlib import Path
from typing import Callable
from engine.config import (
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    VIDEO_FPS,
    TEMP_DIR,
    OUTPUT_DIR,
    get_ffmpeg_video_encoder_flags,
    USE_NVENC,
)
from engine.visuals import compose_frame, download_image_cached
from engine.audio_mixer import create_master_audio


def render_project_to_mp4(
    project: dict,
    voiceover_path: Path | None,
    output_path: Path,
    caption_style: str = "youtube_yellow",
    is_watermarked: bool = False,
    progress_callback: Callable[[int, str], None] | None = None,
) -> Path:
    """
    Renders the entire project into a 1080p MP4 using FFmpeg pipe streaming.
    """
    duration_sec = float(project.get("audioDurationSec") or project.get("audio_duration_sec") or 60.0)
    scenes = project.get("scenes", [])
    if not scenes:
        raise ValueError("Project contains no scenes to render.")

    # Sort scenes by startTime
    scenes = sorted(scenes, key=lambda s: float(s.get("startTime", 0.0)))

    # Step 1: Pre-download all unique images into cache
    if progress_callback:
        progress_callback(5, "Preloading visual storyboard assets...")

    unique_urls = list({
        s.get("gridMasterUrl") or s.get("previewUrl")
        for s in scenes
        if s.get("gridMasterUrl") or s.get("previewUrl")
    })

    for idx, url in enumerate(unique_urls):
        if url:
            download_image_cached(url)
            if progress_callback and idx % 2 == 0:
                pct = 5 + int((idx / max(1, len(unique_urls))) * 10)
                progress_callback(pct, f"Preloaded asset {idx+1}/{len(unique_urls)}...")

    # Step 2: Master Audio Compilation
    if progress_callback:
        progress_callback(18, "Synthesizing 3-track master audio (Voiceover + BGM + SFX)...")

    master_audio_path = TEMP_DIR / f"master_audio_{project.get('id', 'proj')}.wav"
    create_master_audio(
        voiceover_path=voiceover_path,
        scenes=scenes,
        duration_sec=duration_sec,
        output_path=master_audio_path,
    )

    # Step 3: Launch FFmpeg Subprocess with stdin rawvideo pipe
    if progress_callback:
        hw_tag = "NVIDIA GPU (NVENC)" if USE_NVENC else "Multi-core CPU (x264)"
        progress_callback(25, f"Initializing FFmpeg pipeline ({hw_tag})...")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{VIDEO_WIDTH}x{VIDEO_HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(VIDEO_FPS),
        "-i", "-",  # pipe from python stdin
        "-i", str(master_audio_path),
        *get_ffmpeg_video_encoder_flags(),
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(output_path),
    ]

    proc = subprocess.Popen(
        ffmpeg_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )

    total_frames = max(1, int(duration_sec * VIDEO_FPS))
    last_report_time = time.time()

    try:
        for frame_idx in range(total_frames):
            current_sec = frame_idx / VIDEO_FPS

            # Find active scene
            active_scene = scenes[-1]
            for sc in scenes:
                st = float(sc.get("startTime", 0.0))
                et = float(sc.get("endTime", st + 2.0))
                if st <= current_sec < et:
                    active_scene = sc
                    break

            st = float(active_scene.get("startTime", 0.0))
            et = float(active_scene.get("endTime", st + 2.0))
            scene_elapsed = current_sec - st
            scene_duration = max(0.5, et - st)

            frame_img = compose_frame(
                scene=active_scene,
                scene_elapsed=scene_elapsed,
                scene_duration=scene_duration,
                width=VIDEO_WIDTH,
                height=VIDEO_HEIGHT,
                caption_style=caption_style,
                is_watermarked=is_watermarked,
            )

            # Write raw RGB bytes into FFmpeg stdin
            proc.stdin.write(frame_img.tobytes())

            # Progress throttle (report every 1.5s or 5%)
            now = time.time()
            if now - last_report_time > 1.5 and progress_callback:
                pct = 25 + int((frame_idx / total_frames) * 65)
                hw_name = "NVENC GPU" if USE_NVENC else "CPU"
                progress_callback(pct, f"Encoding 1080p MP4 ({hw_name}): Frame {frame_idx}/{total_frames}...")
                last_report_time = now

    except (BrokenPipeError, IOError) as e:
        proc.kill()
        stderr_output = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
        raise RuntimeError(f"FFmpeg process terminated unexpectedly: {e}. Stderr: {stderr_output}")

    finally:
        if proc.stdin:
            proc.stdin.close()
        proc.wait()

        # Clean up temporary master audio
        if master_audio_path.exists():
            master_audio_path.unlink(missing_ok=True)

    if proc.returncode != 0:
        stderr_output = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
        raise RuntimeError(f"FFmpeg failed with exit code {proc.returncode}: {stderr_output}")

    if progress_callback:
        progress_callback(95, "Video encoding complete. Preparing upload...")

    return output_path
