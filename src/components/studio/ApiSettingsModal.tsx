"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Sparkles, X } from "lucide-react";
import { useStudioStore } from "@/store/useStudioStore";

export function ApiSettingsModal() {
  const isOpen = useStudioStore((s) => s.isApiSettingsOpen);
  const close = useStudioStore((s) => s.closeApiSettings);
  const currentKey = useStudioStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useStudioStore((s) => s.setGeminiApiKey);

  const [inputVal, setInputVal] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(inputVal.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      close();
    }, 600);
  };

  const handleClear = () => {
    setInputVal("");
    setGeminiApiKey("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="API Settings"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/80 animate-modal-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-500/15 to-transparent" />

        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="relative">
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">Google Gemini API Settings</h2>
          <p className="mt-1 text-sm text-slate-400">
            Power real-time audio transcription and 2-second storyboard generation with{" "}
            <span className="text-indigo-300 font-mono text-xs">gemini-2.5-flash</span>.
          </p>
        </header>

        <div className="relative mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gemini API Key
            </label>
            <div className="relative mt-1.5">
              <input
                type={showKey ? "text" : "password"}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 pr-10 font-mono text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Your key is saved in your browser&apos;s localStorage only and used on Cloudflare Edge requests.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-xs text-indigo-200">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Intelligent Fallback Included
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-200/80">
              Even without an API key, Waveframe automatically synthesizes a high-retention storyboard tailored to your audio duration and file name.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-rose-400 transition"
            >
              Clear key
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={close}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
              >
                {saved && <Check className="h-3.5 w-3.5 text-emerald-300" />}
                {saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
