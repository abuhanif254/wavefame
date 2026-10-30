export interface PlatformPaymentSettings {
  bkashNumber: string;
  bkashType: "Personal" | "Merchant";
  nagadNumber: string;
  nagadType: "Personal" | "Merchant";
  singlePriceBdt: number;
  creatorPackPriceBdt: number;
}

export const DEFAULT_PAYMENT_SETTINGS: PlatformPaymentSettings = {
  bkashNumber: process.env.BKASH_NUMBER || "01712-345678",
  bkashType: (process.env.BKASH_TYPE as "Personal" | "Merchant") || "Personal",
  nagadNumber: process.env.NAGAD_NUMBER || "01912-345678",
  nagadType: (process.env.NAGAD_TYPE as "Personal" | "Merchant") || "Personal",
  singlePriceBdt: 120,
  creatorPackPriceBdt: 499,
};

let cachedSettings: PlatformPaymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };

export function getCachedSettings(): PlatformPaymentSettings {
  return cachedSettings;
}

export function setCachedSettings(settings: Partial<PlatformPaymentSettings>) {
  cachedSettings = { ...cachedSettings, ...settings };
}
