"""
Waveframe Video Render Engine Configuration & Hardware Detection
"""

import os
import shutil
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Search and load environment files (.env, .env.local, .dev.vars)
BASE_DIR = Path(__file__).resolve().parent.parent
for env_file in [".env.local", ".env", ".dev.vars"]:
    env_path = BASE_DIR / env_file
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
)

# Cloudflare R2 Credentials (S3 Compatible)
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "waveframe-videos")
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN", "")

# Video Specs
VIDEO_WIDTH = int(os.getenv("VIDEO_WIDTH", "1920"))
VIDEO_HEIGHT = int(os.getenv("VIDEO_HEIGHT", "1080"))
VIDEO_FPS = int(os.getenv("VIDEO_FPS", "30"))
AUDIO_SAMPLE_RATE = 44100

# Directory Structure
ENGINE_DIR = Path(__file__).resolve().parent
TEMP_DIR = ENGINE_DIR / "temp"
FONTS_DIR = ENGINE_DIR / "fonts"
OUTPUT_DIR = ENGINE_DIR / "output"

TEMP_DIR.mkdir(parents=True, exist_ok=True)
FONTS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def check_ffmpeg_installed() -> bool:
    """Verifies FFmpeg binary is available on system PATH."""
    return shutil.which("ffmpeg") is not None


def detect_nvenc_support() -> bool:
    """
    Checks if NVIDIA NVENC hardware acceleration is supported by FFmpeg and GPU.
    Returns True on Colab Pro with T4/L4/A100 or machines with NVIDIA GPU.
    """
    if not check_ffmpeg_installed():
        return False
    try:
        result = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        return "h264_nvenc" in result.stdout
    except Exception:
        return False


USE_NVENC = detect_nvenc_support()


def get_ffmpeg_video_encoder_flags() -> list[str]:
    """Returns optimal FFmpeg video encoder parameters based on hardware."""
    if USE_NVENC:
        return [
            "-c:v", "h264_nvenc",
            "-preset", "p4",
            "-cq", "23",
            "-pix_fmt", "yuv420p",
        ]
    else:
        return [
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-threads", "0",
            "-pix_fmt", "yuv420p",
        ]
