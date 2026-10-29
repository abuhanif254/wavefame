import { NextResponse } from "next/server";
import type {
  CameraEffect,
  SceneNode,
  SceneType,
  SoundEffect,
} from "@/types/studio";

export const runtime = "edge";

interface AnalyzeRequest {
  fileName?: string;
  topic?: string;
  durationSec?: number;
  apiKey?: string;
}

const FALLBACK_TOPIC_KEYWORDS: Record<string, { title: string; keywords: string[] }> = {
  crypto: {
    title: "Understanding Crypto & Blockchain",
    keywords: ["Bitcoin", "Ledger", "Decentralized", "Proof of Work", "Smart Contracts", "Gas Fees"],
  },
  ai: {
    title: "How Artificial Intelligence Works",
    keywords: ["Neural Networks", "Weights & Biases", "Backprop", "Transformers", "Tokens", "Inference"],
  },
  finance: {
    title: "The Mechanics of Modern Money",
    keywords: ["Central Banks", "Inflation", "Liquidity", "Interest Rates", "Bonds", "Yield Curve"],
  },
  health: {
    title: "How Cellular Metabolism Powers Life",
    keywords: ["Mitochondria", "ATP Energy", "Glucose", "Enzymes", "Oxidation", "Longevity"],
  },
  history: {
    title: "The Pivotal Shift of Industrialization",
    keywords: ["Steam Engines", "Railways", "Mass Production", "Urbanization", "Telegraph", "Global Trade"],
  },
};

function inferTopicFromFileName(fileName?: string): { title: string; keywords: string[] } {
  const lower = (fileName || "").toLowerCase();
  for (const [key, val] of Object.entries(FALLBACK_TOPIC_KEYWORDS)) {
    if (lower.includes(key)) return val;
  }
  // Generic title based on file
  const clean = (fileName || "audio_explainer")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: clean,
    keywords: ["The Core Concept", "Breaking It Down", "Crucial Factor", "Key Momentum", "Future Outlook"],
  };
}

const SCENE_TYPES: SceneType[] = ["ai_grid_panel", "motion_graphic", "kinetic_text", "stock_footage"];
const CAMERAS: CameraEffect[] = ["zoom_in_slow", "punch_in_fast", "pan_left", "pan_right"];
const SFXS: SoundEffect[] = ["whoosh", "pop", "typewriter", "cinematic_hit"];

/**
 * Builds AI Grid Slicer master image URLs from Pollinations Flux
 */
function attachAiGridSlicing(scenes: SceneNode[]): SceneNode[] {
  let aiCount = 0;
  const aiGroups: SceneNode[][] = [];

  // Group ai_grid_panel scenes in batches of 4
  for (const scene of scenes) {
    if (scene.visualType === "ai_grid_panel") {
      const groupIdx = Math.floor(aiCount / 4);
      if (!aiGroups[groupIdx]) aiGroups[groupIdx] = [];
      scene.quadrantIndex = (aiCount % 4) as 0 | 1 | 2 | 3;
      aiGroups[groupIdx].push(scene);
      aiCount++;
    }
  }

  // Generate 2x2 master prompt and Pollinations URL for each group of 4
  for (let g = 0; g < aiGroups.length; g++) {
    const group = aiGroups[g];
    const masterPrompt = `2x2 visual grid panel: TL: ${group[0]?.imagePrompt || "concept A"}. TR: ${group[1]?.imagePrompt || "concept B"}. BL: ${group[2]?.imagePrompt || "concept C"}. BR: ${group[3]?.imagePrompt || "concept D"}. Ultra-detailed cinematic lighting 8k studio render.`;
    const masterUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(masterPrompt)}?width=1280&height=720&nologo=true&seed=${(g + 1) * 739}`;

    for (const sc of group) {
      sc.gridMasterPrompt = masterPrompt;
      sc.gridMasterUrl = masterUrl;
      // Single preview URL fallback
      if (!sc.previewUrl) {
        sc.previewUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imagePrompt)}?width=1280&height=720&nologo=true&seed=${sc.index * 17 + 3}`;
      }
    }
  }

  return scenes;
}

/**
 * Intelligent tailored fallback storyboard generator
 */
function generateFallbackStoryboard(fileName: string, durationSec: number): { title: string; scenes: SceneNode[] } {
  const { title, keywords } = inferTopicFromFileName(fileName);
  const totalScenes = Math.max(1, Math.ceil(durationSec / 2));
  const scenes: SceneNode[] = [];

  for (let i = 0; i < totalScenes; i++) {
    const startTime = i * 2;
    const endTime = Math.min(startTime + 2, durationSec);
    const kw = keywords[i % keywords.length];
    const visualType = SCENE_TYPES[i % SCENE_TYPES.length];
    const cameraEffect = CAMERAS[(i * 3) % CAMERAS.length];
    const sfx = i === 0 ? "cinematic_hit" : SFXS[(i * 2 + 1) % SFXS.length];

    const transcript =
      i === 0
        ? `Let's break down the truth about ${title}.`
        : `Understanding ${kw}: this fundamentally shifts how the entire system reacts.`;

    const onScreenText =
      i === 0
        ? title.toUpperCase()
        : `${kw.toUpperCase()}`;

    const prompt = `Cinematic explainer illustration of ${kw} in ${title}, glowing holographic visuals, dark studio background, high contrast, 8k resolution`;

    scenes.push({
      id: `scene-${i.toString().padStart(4, "0")}`,
      index: i,
      startTime,
      endTime,
      transcriptSegment: transcript,
      onScreenText,
      visualType,
      imagePrompt: prompt,
      cameraEffect,
      sfx,
      previewUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&seed=${i * 31 + 7}`,
    });
  }

  return { title, scenes: attachAiGridSlicing(scenes) };
}

export async function POST(req: Request) {
  try {
    let body: AnalyzeRequest = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const durationVal = formData.get("durationSec");
      const apiKeyVal = formData.get("apiKey");
      body = {
        fileName: file instanceof File ? file.name : "uploaded_audio.mp3",
        durationSec: durationVal ? Number(durationVal) : 60,
        apiKey: typeof apiKeyVal === "string" ? apiKeyVal : undefined,
      };
    }

    const fileName = body.fileName || "audio_project.mp3";
    const durationSec = Math.max(4, Math.min(body.durationSec || 60, 3600));
    const headerKey = req.headers.get("x-gemini-api-key");
    const apiKey = body.apiKey || headerKey || process.env.GEMINI_API_KEY;

    // If no API key provided, immediately return intelligent tailored fallback
    if (!apiKey) {
      const result = generateFallbackStoryboard(fileName, durationSec);
      return NextResponse.json({
        success: true,
        source: "intelligent_fallback",
        title: result.title,
        audioDurationSec: durationSec,
        scenes: result.scenes,
      });
    }

    // Call real Google Gemini REST API (gemini-2.5-flash)
    // We request up to 30 scenes per Gemini turn to ensure fast response & fit token limits
    const targetSceneCount = Math.min(Math.ceil(durationSec / 2), 24);
    const systemPrompt = `You are a Principal Explainer Video Director. Break down an audio titled "${fileName}" (${durationSec} seconds long) into exactly ${targetSceneCount} rapid 2-second visual scenes for high retention.
Return a STRICT JSON array of objects with the following schema:
[
  {
    "transcriptSegment": "what the narrator says in this 2s cut",
    "onScreenText": "punchy 1-3 word bold text",
    "visualType": "ai_grid_panel" | "motion_graphic" | "stock_footage" | "kinetic_text",
    "imagePrompt": "vivid detailed prompt describing the visual, dark slate-950 neon violet style",
    "cameraEffect": "zoom_in_slow" | "punch_in_fast" | "pan_left" | "pan_right" | "static",
    "sfx": "whoosh" | "typewriter" | "cinematic_hit" | "pop" | "none"
  }
]
No markdown surrounding, no explanation, only valid JSON.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      // If Gemini fails (rate limit, invalid key), seamlessly fall back
      const fallback = generateFallbackStoryboard(fileName, durationSec);
      return NextResponse.json({
        success: true,
        source: "fallback_after_gemini_error",
        error: `Gemini API returned ${res.status}`,
        title: fallback.title,
        audioDurationSec: durationSec,
        scenes: fallback.scenes,
      });
    }

    const data = await res.json();
    const textOutput =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Strip code fence if present
    const cleanJson = textOutput.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsedScenes = JSON.parse(cleanJson);

    if (!Array.isArray(parsedScenes) || parsedScenes.length === 0) {
      throw new Error("Invalid scene array from Gemini");
    }

    const builtScenes: SceneNode[] = parsedScenes.map((item, idx) => {
      const startTime = idx * 2;
      const endTime = Math.min(startTime + 2, durationSec);
      const visualType: SceneType = SCENE_TYPES.includes(item.visualType)
        ? item.visualType
        : SCENE_TYPES[idx % SCENE_TYPES.length];

      return {
        id: `scene-${idx.toString().padStart(4, "0")}`,
        index: idx,
        startTime,
        endTime,
        transcriptSegment: item.transcriptSegment || `Scene ${idx + 1} analysis segment`,
        onScreenText: item.onScreenText || `KEY POINT ${idx + 1}`,
        visualType,
        imagePrompt: item.imagePrompt || `Cinematic render for ${fileName}`,
        cameraEffect: CAMERAS.includes(item.cameraEffect) ? item.cameraEffect : "zoom_in_slow",
        sfx: SFXS.includes(item.sfx) ? item.sfx : "whoosh",
        previewUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.imagePrompt || fileName)}?width=1280&height=720&nologo=true&seed=${idx * 43 + 1}`,
      };
    });

    // If audio is longer than generated scenes, extend to cover the full duration
    if (builtScenes.length * 2 < durationSec) {
      const extraNeeded = Math.ceil(durationSec / 2) - builtScenes.length;
      const fallbackExtra = generateFallbackStoryboard(fileName, durationSec).scenes.slice(builtScenes.length);
      builtScenes.push(...fallbackExtra);
    }

    const enriched = attachAiGridSlicing(builtScenes);

    return NextResponse.json({
      success: true,
      source: "gemini-2.5-flash",
      title: inferTopicFromFileName(fileName).title,
      audioDurationSec: durationSec,
      scenes: enriched,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    const fallback = generateFallbackStoryboard("Uploaded Audio", 60);
    return NextResponse.json({
      success: true,
      source: "fallback_exception",
      error: errorMsg,
      title: fallback.title,
      audioDurationSec: 60,
      scenes: fallback.scenes,
    });
  }
}
