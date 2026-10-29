"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { readAudioDuration } from "@/lib/audio";
import { useStudioStore } from "@/store/useStudioStore";

export function UploadAudioButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRealAudio = useStudioStore((s) => s.uploadRealAudio);
  const isAnalyzing = useStudioStore((s) => s.project.status === "analyzing");
  const [isReadingDuration, setIsReadingDuration] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setIsReadingDuration(true);
    try {
      const durationSec = await readAudioDuration(file);
      await uploadRealAudio(file, durationSec ?? 60);
    } finally {
      setIsReadingDuration(false);
    }
  };

  const busy = isAnalyzing || isReadingDuration;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a,audio/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        title="Upload a real .mp3, .wav, or .m4a audio file"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" /> : <Upload className="h-3.5 w-3.5" />}
        <span className="hidden md:inline">Upload audio</span>
      </button>
    </>
  );
}
