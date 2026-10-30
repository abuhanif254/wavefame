"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Lock, Mail, Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth/authStore";

export function AuthModal() {
  const isOpen = useAuthStore((s) => s.isAuthModalOpen);
  const close = useAuthStore((s) => s.closeAuthModal);
  const isConfigured = useAuthStore((s) => s.isConfigured);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        const res = await signInWithEmail(email, password || "password123");
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          close();
        }
      } else {
        const res = await signUpWithEmail(email, password || "password123", fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg("Account created! 1-Minute Free Trial activated.");
          setTimeout(() => close(), 1200);
        }
      }
    } catch {
      setErrorMsg("Failed to authenticate. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account Authentication"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/70 animate-modal-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/15 to-transparent" />

        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="relative mb-5 space-y-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
            <Sparkles className="h-3 w-3" />
            1-Minute Free Trial Included
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {mode === "login" ? "Welcome back to Waveframe" : "Claim your 1-Minute Free Trial"}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === "login"
              ? "Sign in to access your projects, credit balance, and export history."
              : "Create an account in 10 seconds to generate and export your first explainer video."}
          </p>
        </header>

        {!isConfigured && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
            <span className="font-semibold">Local Fallback Active:</span> Supabase credentials not yet detected in environment. Instant local login enabled.
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="relative flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 10.5 0 12s.6 2.8 1.6 4.8l3.7-2.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-800" />
          <span className="absolute bg-slate-900 px-2 text-[10px] uppercase tracking-wider text-slate-500">
            or with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400">Your Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rahim Ahmed"
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-400">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              "Sign In to Studio"
            ) : (
              "Create Account & Start Trial"
            )}
          </button>
        </form>

        <footer className="mt-4 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-medium text-indigo-400 hover:text-indigo-300 underline"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-indigo-400 hover:text-indigo-300 underline"
              >
                Log in
              </button>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
