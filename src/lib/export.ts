import type { ProjectState } from "@/types/studio";
import { slugify } from "@/lib/utils";

/**
 * Downloads the project's edit decision list (scenes, camera moves, SFX) as JSON.
 * Runs fully client-side (Blob + anchor), so there is no server dependency.
 */
export function downloadProjectManifest(project: ProjectState): void {
  const manifest = {
    exportedAt: new Date().toISOString(),
    id: project.id,
    title: project.title,
    audioDurationSec: project.audioDurationSec,
    scenes: project.scenes.map(({ previewUrl: _previewUrl, ...scene }) => scene),
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(project.title)}.edl.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
