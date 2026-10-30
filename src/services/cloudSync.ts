/**
 * Waveframe Phase 3: Cloud Sync & Persistence Engine
 * Saves and restores Studio projects to/from Supabase with graceful localStorage fallback.
 */

import type { ProjectState } from "@/types/studio";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type SyncStatus = "synced" | "saving" | "offline" | "error";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function saveProject(
  project: ProjectState,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Always persist locally first for instant resiliency
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("waveframe_current_project", JSON.stringify(project));
      localStorage.setItem(`waveframe_project_${project.id}`, JSON.stringify(project));
    } catch {
      // ignore storage quota errors
    }
  }

  if (!isSupabaseConfigured || !userId) {
    return { success: true };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { success: true };

  try {
    const payload = {
      id: project.id,
      user_id: userId,
      title: project.title,
      audio_duration_sec: project.audioDurationSec,
      audio_url: project.audioUrl || null,
      audio_file_name: project.audioFileName || null,
      status: project.status,
      is_unlocked: project.isUnlocked,
      scenes: project.scenes,
      expires_at: project.expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("projects").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase project sync error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || "Sync failed" };
  }
}

export function debouncedSaveProject(
  project: ProjectState,
  userId: string | undefined,
  onStatusChange?: (status: SyncStatus) => void
) {
  if (saveTimeout) clearTimeout(saveTimeout);
  onStatusChange?.("saving");

  saveTimeout = setTimeout(async () => {
    const res = await saveProject(project, userId);
    if (res.success) {
      onStatusChange?.(isSupabaseConfigured && userId ? "synced" : "offline");
    } else {
      onStatusChange?.("error");
    }
  }, 1200);
}
