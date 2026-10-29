/**
 * Reads an audio file's duration in the browser using HTML5 Audio metadata
 * with AudioContext decodeAudioData fallback.
 */
export async function readAudioDuration(file: File, timeoutMs = 4000): Promise<number | null> {
  if (typeof window === "undefined") return null;

  // 1. Try fast HTML5 Audio metadata check
  const durationFromAudio = await new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        finish(audio.duration);
      } else {
        finish(null);
      }
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });

  if (durationFromAudio !== null) return durationFromAudio;

  // 2. Fallback to Web Audio API arrayBuffer decode
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const buffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const dur = audioBuffer.duration;
      void ctx.close();
      if (Number.isFinite(dur) && dur > 0) return dur;
    }
  } catch {
    // Decoding failed or unsupported format
  }

  return null;
}
