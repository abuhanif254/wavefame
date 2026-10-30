"""
Cloud Storage Service for Audio Downloading and Video Uploads
Supports Cloudflare R2 (S3-compatible) with fallback to Supabase Storage or local path.
"""

import os
import time
import urllib.parse
from pathlib import Path
import httpx
from engine.config import (
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_DOMAIN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    TEMP_DIR,
)

try:
    import boto3
    from botocore.config import Config
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


def download_audio_file(audio_url: str, dest_path: Path) -> Path:
    """
    Downloads audio file from URL or copies if local path.
    """
    if not audio_url:
        raise ValueError("Audio URL is empty")

    if audio_url.startswith("file://") or os.path.exists(audio_url):
        clean_path = audio_url.replace("file://", "")
        if os.path.exists(clean_path):
            with open(clean_path, "rb") as src, open(dest_path, "wb") as dst:
                dst.write(src.read())
            return dest_path

    # HTTP / HTTPS download
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(audio_url)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(resp.content)

    return dest_path


def get_r2_s3_client():
    """Initializes boto3 S3 client targeted at Cloudflare R2 endpoint."""
    if not HAS_BOTO3 or not (R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY):
        return None

    endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_video_file(video_path: Path, project_id: str) -> str:
    """
    Uploads the rendered .mp4 video to Cloudflare R2 or Supabase Storage,
    returning a 24-hour secure download URL.
    """
    timestamp = int(time.time())
    file_name = f"renders/{project_id}_{timestamp}.mp4"

    # 1. Attempt Cloudflare R2 Upload
    s3_client = get_r2_s3_client()
    if s3_client:
        try:
            with open(video_path, "rb") as f:
                s3_client.put_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=file_name,
                    Body=f,
                    ContentType="video/mp4",
                )

            if R2_PUBLIC_DOMAIN:
                clean_domain = R2_PUBLIC_DOMAIN.rstrip("/")
                return f"{clean_domain}/{file_name}"

            # 24-hour presigned URL (86400 seconds)
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": R2_BUCKET_NAME, "Key": file_name},
                ExpiresIn=86400,
            )
            return presigned_url
        except Exception as e:
            print(f"[Storage] R2 upload warning: {e}. Falling back to Supabase Storage.")

    # 2. Attempt Supabase Storage Upload
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            bucket_name = "videos"

            with open(video_path, "rb") as f:
                file_bytes = f.read()

            supabase.storage.from_(bucket_name).upload(
                file_name,
                file_bytes,
                {"content-type": "video/mp4", "upsert": "true"},
            )

            # Generate 24-hour signed download URL
            signed = supabase.storage.from_(bucket_name).create_signed_url(file_name, 86400)
            if signed and "signedURL" in signed:
                return signed["signedURL"]
            elif signed and "signedUrl" in signed:
                return signed["signedUrl"]
        except Exception as e:
            print(f"[Storage] Supabase Storage warning: {e}")

    # 3. Fallback: Return absolute local file path for local worker
    return str(video_path.resolve())
