import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waveframe — Turn Audio into High-Retention Explainer Videos",
  description:
    "Upload 20 minutes of audio and get a fully editable, scene-by-scene explainer video in minutes. Pay per video with bKash or Nagad.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-slate-950 font-sans">{children}</body>
    </html>
  );
}
