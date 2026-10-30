/**
 * Waveframe Phase 3: Auth, User Profile & Database Types
 * Edge Runtime and Cloudflare Pages compatible.
 */

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  credits: number;
  has_used_free_trial: boolean;
  is_admin: boolean;
  created_at?: string;
}

export type PaymentGateway = "bkash" | "nagad" | "manual" | "promo";
export type PaymentPlanType = "single_video" | "creator_pack" | "promo";
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentRecord {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  gateway: PaymentGateway;
  plan_type: PaymentPlanType;
  amount_bdt: number;
  sender_phone: string;
  trx_id: string;
  status: PaymentStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PromoCodeRecord {
  id: string;
  code: string;
  credits: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface PaymentSubmissionRequest {
  userId?: string;
  userEmail?: string;
  projectId?: string;
  gateway: PaymentGateway;
  planType: PaymentPlanType;
  amountBdt: number;
  senderPhone: string;
  trxId: string;
}
