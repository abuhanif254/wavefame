import {
  AudioLines,
  Camera,
  Clapperboard,
  Hourglass,
  Layers,
  Scissors,
  Smartphone,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react";

const STEPS: ReadonlyArray<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Upload, title: "Upload your audio", body: "Drop in up to 20 minutes of narration. Try 1 minute free first." },
  { icon: Wand2, title: "AI builds every scene", body: "We transcribe, detect beats, and storyboard rapid 2-second cuts automatically." },
  { icon: Clapperboard, title: "Edit, unlock, export", body: "Tweak any scene in the studio, then unlock the full 1080p render for ৳120." },
];

const FEATURES: ReadonlyArray<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Layers, title: "Hybrid Visual Engine", body: "AI 2x2 grids, motion charts, stock footage and kinetic text are mixed per scene to keep eyes glued." },
  { icon: Scissors, title: "Scene-level control", body: "Rewrite on-screen text, swap visual types and refine AI prompts for any individual cut." },
  { icon: Camera, title: "Virtual camera moves", body: "Slow zooms, punch-ins and pans add cinematic motion to every still." },
  { icon: AudioLines, title: "Auto sound design", body: "Whooshes, pops, typewriter clicks and cinematic hits placed on the beat." },
  { icon: Smartphone, title: "Built for local payments", body: "Checkout in a tap with bKash or Nagad. No international card required." },
  { icon: Hourglass, title: "Private by default", body: "Files auto-delete after 24 hours. Download your video and your data is gone." },
];

export function FeatureSections() {
  return (
    <>
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <SectionHeading eyebrow="How it works" title="From raw audio to a finished video in three steps" />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6">
              <span className="absolute right-5 top-5 font-mono text-xs text-slate-600">0{i + 1}</span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <SectionHeading eyebrow="Features" title="Everything a studio does, minus the timeline pain" />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-slate-950 p-6 transition hover:bg-slate-900/70">
              <Icon className="h-5 w-5 text-violet-300" />
              <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{eyebrow}</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
    </div>
  );
}
