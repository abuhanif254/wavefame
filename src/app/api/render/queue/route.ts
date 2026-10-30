import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, projectData, captionStyle } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Fetch project to verify unlock status
        const { data: project } = await supabase
          .from("projects")
          .select("id, is_unlocked, status")
          .eq("id", projectId)
          .maybeSingle();

        const isUnlocked = project?.is_unlocked ?? projectData?.isUnlocked ?? false;
        if (!isUnlocked) {
          return NextResponse.json(
            { error: "1080p Cloud GPU rendering is reserved for unlocked projects. Please unlock or use browser preview." },
            { status: 403 }
          );
        }

        // Upsert / update project record to 'queued' state
        const updatePayload: Record<string, unknown> = {
          render_status: "queued",
          render_progress: 0,
          render_stage: "Enqueued for GPU Worker...",
          render_error: null,
          updated_at: new Date().toISOString(),
        };

        if (projectData) {
          if (projectData.scenes) updatePayload.scenes = projectData.scenes;
          if (projectData.audioDurationSec) updatePayload.audio_duration_sec = projectData.audioDurationSec;
          if (projectData.title) updatePayload.title = projectData.title;
          if (projectData.audioUrl) {
            updatePayload.audio_url = projectData.audioUrl;
            updatePayload.audio_storage_url = projectData.audioUrl;
          }
          if (captionStyle) {
            updatePayload.caption_style = captionStyle;
          }
        }

        const { error: updateError } = await supabase
          .from("projects")
          .update(updatePayload)
          .eq("id", projectId);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "Project successfully placed in the Cloud GPU render queue.",
          projectId,
          renderStatus: "queued",
        });
      }
    }

    // Local / Dev Fallback
    return NextResponse.json({
      success: true,
      message: "Project enqueued (local fallback mode).",
      projectId,
      renderStatus: "queued",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to enqueue project." },
      { status: 500 }
    );
  }
}
