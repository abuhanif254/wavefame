"""
Master 3-Track Audio Mixer for Waveframe Render Engine
Synthesizes procedural ambient background pads, transition sound effects,
and mixes them with the user's voiceover into a studio-grade master audio track.
"""

import subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy import signal
from engine.config import AUDIO_SAMPLE_RATE, TEMP_DIR


def generate_ambient_bgm(duration_sec: float, sr: int = AUDIO_SAMPLE_RATE, volume: float = 0.045) -> np.ndarray:
    """
    Synthesizes a cinematic C-minor ambient drone pad using dual warm oscillators,
    subtle harmonics, and a low-pass filter. Auto-ducked at 4.5% volume.
    """
    num_samples = int(duration_sec * sr)
    if num_samples <= 0:
        return np.zeros((0, 2), dtype=np.float32)

    t = np.linspace(0, duration_sec, num_samples, endpoint=False, dtype=np.float32)

    # C-minor frequencies: C2 (65.41Hz), G2 (98.0Hz), C3 (130.81Hz), Eb3 (155.56Hz)
    f_c2 = 65.41
    f_g2 = 98.00
    f_c3 = 130.81
    f_eb3 = 155.56

    # Slow modulation LFO (0.15 Hz)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.15 * t)

    osc1 = np.sin(2 * np.pi * f_c2 * t) * 0.45
    osc2 = signal.sawtooth(2 * np.pi * f_g2 * t) * 0.25
    osc3 = np.sin(2 * np.pi * f_c3 * t) * 0.35
    osc4 = np.sin(2 * np.pi * f_eb3 * t) * 0.20

    raw = (osc1 + osc2 + osc3 + osc4) * lfo

    # Butterworth low-pass filter at 380 Hz
    b, a = signal.butter(4, 380 / (sr / 2), btype="low")
    filtered = signal.filtfilt(b, a, raw).astype(np.float32)

    # Smooth attack and release envelope (0.5s fade-in, 1.0s fade-out)
    attack_samples = min(int(0.5 * sr), num_samples)
    release_samples = min(int(1.0 * sr), num_samples)
    envelope = np.ones(num_samples, dtype=np.float32)

    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0.0, 1.0, attack_samples)
    if release_samples > 0:
        envelope[-release_samples:] = np.linspace(1.0, 0.0, release_samples)

    stereo = np.column_stack((filtered * envelope * volume, filtered * envelope * volume))
    return stereo.astype(np.float32)


def generate_sfx(sfx_type: str, sr: int = AUDIO_SAMPLE_RATE) -> np.ndarray:
    """
    Procedurally generates cinematic sound effects directly in code via numpy/scipy.
    Types: 'whoosh', 'pop', 'cinematic_hit', 'typewriter'
    """
    if sfx_type == "whoosh":
        # White noise sweep through bandpass filter (0.28s)
        dur = 0.28
        n_samples = int(dur * sr)
        t = np.linspace(0, dur, n_samples, endpoint=False, dtype=np.float32)
        noise = (np.random.rand(n_samples) * 2 - 1).astype(np.float32)
        env = np.exp(-t / (dur * 0.35)).astype(np.float32)

        # Resonant bandpass filter
        b, a = signal.butter(2, [350 / (sr / 2), 1800 / (sr / 2)], btype="band")
        filtered = signal.lfilter(b, a, noise * env).astype(np.float32)
        return filtered * 0.40

    elif sfx_type == "pop":
        # Sine pitch drop (750Hz -> 180Hz over 0.1s)
        dur = 0.10
        n_samples = int(dur * sr)
        t = np.linspace(0, dur, n_samples, endpoint=False, dtype=np.float32)
        freq = 750.0 * np.exp(-t * 22.0)
        phase = 2 * np.pi * np.cumsum(freq) / sr
        env = np.exp(-t * 30.0).astype(np.float32)
        return (np.sin(phase) * env * 0.35).astype(np.float32)

    elif sfx_type == "cinematic_hit":
        # Sub-bass punch (110Hz dive to 32Hz over 0.5s)
        dur = 0.50
        n_samples = int(dur * sr)
        t = np.linspace(0, dur, n_samples, endpoint=False, dtype=np.float32)
        freq = 110.0 * np.exp(-t * 5.0) + 32.0
        phase = 2 * np.pi * np.cumsum(freq) / sr
        env = np.exp(-t * 6.5).astype(np.float32)
        hit = np.sin(phase) * env * 0.65
        # Soft saturation
        hit = np.tanh(hit * 1.5).astype(np.float32)
        return hit

    elif sfx_type == "typewriter":
        # Crisp mechanical click transient (0.04s)
        dur = 0.04
        n_samples = int(dur * sr)
        t = np.linspace(0, dur, n_samples, endpoint=False, dtype=np.float32)
        freq = 2200.0
        env = np.exp(-t * 90.0).astype(np.float32)
        click = signal.sawtooth(2 * np.pi * freq * t) * env * 0.25
        return click.astype(np.float32)

    return np.zeros(0, dtype=np.float32)


def extract_or_convert_voiceover(input_path: Path, output_wav: Path, duration_sec: float, sr: int = AUDIO_SAMPLE_RATE):
    """
    Uses FFmpeg to decode any input audio format (.mp3, .wav, .m4a) to 16-bit PCM WAV.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vn",
        "-ar", str(sr),
        "-ac", "2",
        "-t", str(duration_sec),
        str(output_wav),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def create_master_audio(
    voiceover_path: Path | None,
    scenes: list[dict],
    duration_sec: float,
    output_path: Path,
    is_bgm_muted: bool = False,
    is_sfx_muted: bool = False,
    sr: int = AUDIO_SAMPLE_RATE,
) -> Path:
    """
    Combines Track 1 (Voiceover), Track 2 (Ambient BGM), and Track 3 (Scene Transition SFX)
    into a single 44.1kHz stereo 16-bit master WAV file.
    """
    total_samples = int(duration_sec * sr)
    master_audio = np.zeros((total_samples, 2), dtype=np.float32)

    # Track 1: Voiceover
    if voiceover_path and voiceover_path.exists():
        temp_voice_wav = TEMP_DIR / f"temp_voice_{output_path.stem}.wav"
        try:
            extract_or_convert_voiceover(voiceover_path, temp_voice_wav, duration_sec, sr)
            voice_sr, voice_data = wavfile.read(temp_voice_wav)

            # Convert to float32 (-1.0 to 1.0)
            if voice_data.dtype == np.int16:
                voice_data = (voice_data / 32768.0).astype(np.float32)
            elif voice_data.dtype == np.int32:
                voice_data = (voice_data / 2147483648.0).astype(np.float32)

            if voice_data.ndim == 1:
                voice_data = np.column_stack((voice_data, voice_data))

            num_voice = min(len(voice_data), total_samples)
            master_audio[:num_voice, :] += voice_data[:num_voice, :]
        except Exception as e:
            print(f"[AudioMixer] Voiceover decode warning: {e}")
        finally:
            if temp_voice_wav.exists():
                temp_voice_wav.unlink(missing_ok=True)

    # Track 2: Procedural Ambient Synth Pad (Auto-Ducked at 4.5% volume)
    if not is_bgm_muted:
        bgm = generate_ambient_bgm(duration_sec, sr, volume=0.045)
        num_bgm = min(len(bgm), total_samples)
        master_audio[:num_bgm, :] += bgm[:num_bgm, :]

    # Track 3: Procedural Transition Sound Effects (Scheduled at scene cut timestamps)
    if not is_sfx_muted:
        for sc in scenes:
            sfx_type = sc.get("sfx")
            if not sfx_type or sfx_type == "none":
                continue

            start_sec = float(sc.get("startTime", 0.0))
            if start_sec >= duration_sec:
                continue

            start_idx = int(start_sec * sr)
            sfx_wave = generate_sfx(sfx_type, sr)
            if len(sfx_wave) == 0:
                continue

            end_idx = min(start_idx + len(sfx_wave), total_samples)
            actual_len = end_idx - start_idx
            if actual_len > 0:
                master_audio[start_idx:end_idx, 0] += sfx_wave[:actual_len]
                master_audio[start_idx:end_idx, 1] += sfx_wave[:actual_len]

    # Master Limiter / Anti-clipping
    master_audio = np.clip(master_audio, -0.98, 0.98)
    pcm16 = (master_audio * 32767.0).astype(np.int16)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(output_path, sr, pcm16)
    return output_path
