/**
 * Zero-Dependency Web Audio API Sound Effect Synthesizer.
 * Generates crisp, cinematic studio transients and risers entirely in code.
 * Safe for SSR and respects browser autoplay policies.
 */

import type { SoundEffect } from "@/types/studio";

let audioCtx: AudioContext | null = null;
let isSfxMuted = false;
let masterGain: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  if (!masterGain && audioCtx) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

/** White noise buffer helper */
function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * 1. Whoosh: Filtered white-noise frequency sweep (air transition riser)
 */
function synthWhoosh(ctx: AudioContext, dest: AudioNode, volume = 0.6) {
  const t0 = ctx.currentTime;
  const duration = 0.42;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2.4;
  filter.frequency.setValueAtTime(320, t0);
  filter.frequency.exponentialRampToValueAtTime(3400, t0 + duration * 0.55);
  filter.frequency.exponentialRampToValueAtTime(380, t0 + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + duration * 0.48);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  noise.start(t0);
  noise.stop(t0 + duration);
}

/**
 * 2. Pop: Crisp sine pitch-drop bubble pop
 */
function synthPop(ctx: AudioContext, dest: AudioNode, volume = 0.7) {
  const t0 = ctx.currentTime;
  const duration = 0.085;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(140, t0 + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(t0);
  osc.stop(t0 + duration);
}

/**
 * 3. Typewriter: Rapid mechanical dual-click transient
 */
function synthTypewriter(ctx: AudioContext, dest: AudioNode, volume = 0.5) {
  const t0 = ctx.currentTime;

  // Click 1
  const click = (timeOffset: number, pitch: number, clickVol: number) => {
    const t = t0 + timeOffset;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.3, t + 0.02);

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.025);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(clickVol, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.025);
    noise.start(t);
    noise.stop(t + 0.025);
  };

  click(0, 1600, volume);
  click(0.016, 1100, volume * 0.7);
}

/**
 * 4. Cinematic Hit: Sub-bass impact + punch transient + reverb decay tail
 */
function synthCinematicHit(ctx: AudioContext, dest: AudioNode, volume = 0.85) {
  const t0 = ctx.currentTime;

  // Sub-bass pitch dive
  const subOsc = ctx.createOscillator();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(145, t0);
  subOsc.frequency.exponentialRampToValueAtTime(34, t0 + 0.45);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.001, t0);
  subGain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);

  subOsc.connect(subGain);
  subGain.connect(dest);
  subOsc.start(t0);
  subOsc.stop(t0 + 1.15);

  // High-frequency punch click
  const punchOsc = ctx.createOscillator();
  punchOsc.type = "triangle";
  punchOsc.frequency.setValueAtTime(450, t0);
  punchOsc.frequency.exponentialRampToValueAtTime(80, t0 + 0.05);

  const punchGain = ctx.createGain();
  punchGain.gain.setValueAtTime(volume * 0.8, t0);
  punchGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

  punchOsc.connect(punchGain);
  punchGain.connect(dest);
  punchOsc.start(t0);
  punchOsc.stop(t0 + 0.065);

  // Cinematic reverb rumble tail
  const tail = ctx.createBufferSource();
  tail.buffer = createNoiseBuffer(ctx, 1.2);

  const tailFilter = ctx.createBiquadFilter();
  tailFilter.type = "lowpass";
  tailFilter.frequency.setValueAtTime(600, t0);
  tailFilter.frequency.exponentialRampToValueAtTime(120, t0 + 0.8);

  const tailGain = ctx.createGain();
  tailGain.gain.setValueAtTime(0.001, t0);
  tailGain.gain.linearRampToValueAtTime(volume * 0.45, t0 + 0.03);
  tailGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);

  tail.connect(tailFilter);
  tailFilter.connect(tailGain);
  tailGain.connect(dest);

  tail.start(t0);
  tail.stop(t0 + 1.25);
}

/**
 * Public SFX Service
 */
export const sfxEngine = {
  isMuted: () => isSfxMuted,

  setMuted: (muted: boolean) => {
    isSfxMuted = muted;
    return isSfxMuted;
  },

  toggleMute: () => {
    isSfxMuted = !isSfxMuted;
    return isSfxMuted;
  },

  play: (effect: SoundEffect, customVolume?: number) => {
    if (effect === "none" || isSfxMuted) return;
    const ctx = getContext();
    if (!ctx || !masterGain) return;

    try {
      switch (effect) {
        case "whoosh":
          synthWhoosh(ctx, masterGain, customVolume);
          break;
        case "pop":
          synthPop(ctx, masterGain, customVolume);
          break;
        case "typewriter":
          synthTypewriter(ctx, masterGain, customVolume);
          break;
        case "cinematic_hit":
          synthCinematicHit(ctx, masterGain, customVolume);
          break;
      }
    } catch {
      // AudioContext state or permission error safe ignore
    }
  },
};
