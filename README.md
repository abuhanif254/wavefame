# Waveframe — AI Audio-to-Explainer-Video Studio Engine

Next.js 15 (App Router) · Cloudflare Pages & Edge Ready · Web Audio Synthesizer · HTML5 Canvas Video Exporter

```bash
npm install
npm run dev     # http://localhost:3000 (landing) · /studio (editor)
npm run build   # Cloudflare Edge compatible build
npm run lint    # tsc --noEmit
```

## Phase 2 Architecture & Features

### 1. Real Audio Upload & Synchronized Playback
- **Universal audio support**: Upload `.mp3`, `.wav`, or `.m4a` files directly in `/studio`.
- Real metadata duration reading with Web Audio `AudioContext.decodeAudioData` fallback.
- Bidirectional synchronization between the real `<audio>` element, the timeline scrubber, scene cuts, and the 30-second paywall boundary.

### 2. Zero-Dependency Web Audio SFX Synthesizer (`src/services/sfxEngine.ts`)
- Studio sound design generated in pure code via Web Audio API:
  - `whoosh`: Bandpass-filtered white noise frequency sweep.
  - `pop`: Crisp sine pitch drop bubble transient.
  - `typewriter`: Dual mechanical click transients with highpass noise.
  - `cinematic_hit`: Sub-bass pitch dive (145Hz → 34Hz) + punch transient + rumble decay tail.
- Real-time SFX transition triggers on scene cuts during playback.
- Player control SFX mute/unmute toggle.
- Interactive SFX preview buttons in the Scene Inspector.

### 3. "1-to-4 AI Grid Slicer" & Visual Renderer (`src/components/studio/SceneCanvas.tsx`)
- **Cost-Cutting AI Slicer**: Batches every 4 `ai_grid_panel` scenes into a single 2x2 master image request.
- Sub-pixel quadrant cropping (`0% 0%`, `100% 0%`, `0% 100%`, `100% 100%` with `background-size: 200% 200%`).
- Zero-cost real AI image generation via Pollinations Flux (`image.pollinations.ai`).
- Real-time visual updates whenever `imagePrompt` is edited in the Scene Inspector.
- Rich animated infographic templates for `motion_graphic` (animated comparison bars, glowing radial stat counter, and process flow nodes).

### 4. Edge Gemini AI Storyboard Engine (`src/app/api/analyze-audio/route.ts`)
- Cloudflare Pages / Workers Edge Route (`export const runtime = 'edge'`).
- Calls Google Gemini 2.5 Flash REST API (`gemini-2.5-flash:generateContent`).
- Sleek in-studio **API Settings Modal** to configure Gemini API Key (stored locally).
- Intelligent fallback storyboard generator that synthesizes tailored 2-second scenes matching the audio's exact file name and duration.

### 5. In-Browser Video Exporter (`src/services/videoExporter.ts`)
- Client-side rendering pipeline: HTML5 2D Canvas + Web Audio stream + `MediaRecorder`.
- Exports animated 2-second cuts, camera transforms, kinetic typography, subtitles, and audio into `.webm`.
- Dual options: Free 30-second preview export or full unlocked 1080p render.
