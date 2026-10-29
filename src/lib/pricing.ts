import type { PricingPlan } from "@/types/studio";

export const SINGLE_PRICE_BDT = 120;
export const CREATOR_PACK_PRICE_BDT = 499;
export const CREATOR_PACK_VIDEOS = 5;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "single",
    name: "Single Video Pass",
    priceBdt: SINGLE_PRICE_BDT,
    videos: 1,
    description: "Unlock one full-length video in 1080p.",
    perks: ["Full-length render up to 20 min", "1080p export", "All scene edits included"],
  },
  {
    id: "creator_pack",
    name: "Creator 5-Video Pack",
    priceBdt: CREATOR_PACK_PRICE_BDT,
    videos: CREATOR_PACK_VIDEOS,
    description: "Best value for weekly publishers.",
    perks: ["5 full-length 1080p videos", "Priority render queue", "Credits never expire"],
    highlighted: true,
  },
];

export function getPlan(id: PricingPlan["id"]): PricingPlan {
  const plan = PRICING_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown pricing plan: ${id}`);
  return plan;
}

export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString("en-US")}`;
}
