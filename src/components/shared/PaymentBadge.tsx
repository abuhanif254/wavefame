import type { PaymentProvider } from "@/types/studio";
import { cn } from "@/lib/utils";

const STYLES: Record<PaymentProvider, { label: string; className: string; dot: string }> = {
  bkash: {
    label: "bKash",
    className: "border-[#E2136E]/40 bg-[#E2136E]/10 text-[#ff6fae]",
    dot: "bg-[#E2136E]",
  },
  nagad: {
    label: "Nagad",
    className: "border-[#F6921E]/40 bg-[#F6921E]/10 text-[#ffb35c]",
    dot: "bg-[#F6921E]",
  },
};

export function PaymentBadge({
  provider,
  className,
}: {
  provider: PaymentProvider;
  className?: string;
}) {
  const s = STYLES[provider];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        s.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
