import { FeatureSections } from "@/components/landing/FeatureSections";
import { FinalCta, Footer } from "@/components/landing/FinalCta";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-slate-950">
      <LandingNav />
      <main>
        <HeroSection />
        <FeatureSections />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
