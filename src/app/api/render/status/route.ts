import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: project, error } = await supabase
          .from("projects")
          .select("id, render_status, render_progress, render_stage, video_download_url, render_error, is_unlocked")
          .eq("id", projectId)
          .maybeSingle();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (project) {
          return NextResponse.json({
            success: true,
            projectId: project.id,
            renderStatus: project.render_status || "idle",
            renderProgress: project.render_progress ?? 0,
            renderStage: project.render_stage || "",
            videoDownloadUrl: project.video_download_url || null,
            renderError: project.render_error || null,
            isUnlocked: project.is_unlocked,
          });
        }
      }
    }

    // Default response if not found or local
    return NextResponse.json({
      success: true,
      projectId,
      renderStatus: "idle",
      renderProgress: 0,
      renderStage: "",
      videoDownloadUrl: null,
      renderError: null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to retrieve render status." },
      { status: 500 }
    );
  }
}
