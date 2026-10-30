-- ==============================================================================
-- Waveframe: Phase 3 Database Schema & Migration
-- High-Performance Persistence, Payments, Anti-Abuse & Admin Controls
-- Compatible with Supabase Postgres + Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
-- Linked directly to auth.users. Tracks video credit balance, free trial usage, and admin privileges.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  has_used_free_trial BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick email & admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- 3. PROJECTS TABLE
-- Stores project metadata, audio details, scenes breakdown JSONB, unlock status, and 24-hour auto-expiry.
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Explainer Video',
  audio_duration_sec NUMERIC NOT NULL DEFAULT 1200 CHECK (audio_duration_sec >= 0),
  audio_url TEXT,
  audio_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'preview_ready' CHECK (status IN ('idle', 'analyzing', 'preview_ready', 'rendering_full', 'completed')),
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for user queries and 24-hour expiry cleanups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_expires_at ON public.projects(expires_at);

-- 4. PAYMENTS TABLE
-- Records bKash and Nagad direct transactions (Single Video ৳120 / 5-Video Pack ৳499) and TrxIDs.
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('bkash', 'nagad', 'manual', 'promo')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('single_video', 'creator_pack', 'promo')),
  amount_bdt NUMERIC NOT NULL DEFAULT 0 CHECK (amount_bdt >= 0),
  sender_phone TEXT NOT NULL DEFAULT '',
  trx_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_trx_id ON public.payments(trx_id);

-- 5. PROMO CODES TABLE
-- Founder tools to generate and distribute promotional / partnership credit codes.
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 1 CHECK (credits > 0),
  max_uses INTEGER NOT NULL DEFAULT 100 CHECK (max_uses >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

-- Seed Initial Promo Codes
INSERT INTO public.promo_codes (code, credits, max_uses, is_active)
VALUES 
  ('LAUNCH2026', 1, 500, true),
  ('CREATORVIP', 5, 50, true),
  ('WAVEFRAME100', 1, 1000, true)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- 6. SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Check if current authenticated caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Automatically create profile row when user signs up via auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits, has_used_free_trial, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    0, -- Initial credit balance
    false,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Atomic Promo Code Redemption Function
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_promo RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promotional code.');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has reached its maximum redemptions.');
  END IF;

  -- Update promo code usage count
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE id = v_promo.id;

  -- Add credits to user profile
  UPDATE public.profiles
  SET credits = credits + v_promo.credits,
      updated_at = now()
  WHERE id = v_user_id;

  -- Record promo transaction
  INSERT INTO public.payments (user_id, gateway, plan_type, amount_bdt, sender_phone, trx_id, status, admin_notes)
  VALUES (
    v_user_id,
    'promo',
    'promo',
    0,
    'PROMO_REDEEM',
    'PROMO-' || upper(trim(p_code)) || '-' || gen_random_uuid()::text,
    'approved',
    'Redeemed promo code ' || upper(trim(p_code)) || ' for ' || v_promo.credits || ' credits.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'credits_added', v_promo.credits,
    'code', upper(trim(p_code))
  );
END;
$$;

-- Atomic Payment Approval Function for Founder Admin
CREATE OR REPLACE FUNCTION public.approve_payment(p_payment_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required.');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment transaction not found.');
  END IF;

  IF v_payment.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment is already approved.');
  END IF;

  -- Mark Payment Approved
  UPDATE public.payments
  SET status = 'approved',
      admin_notes = COALESCE(p_notes, admin_notes),
      updated_at = now()
  WHERE id = p_payment_id;

  -- If Single Video pass and has project_id, unlock project
  IF v_payment.plan_type = 'single_video' AND v_payment.project_id IS NOT NULL THEN
    UPDATE public.projects
    SET is_unlocked = true,
        updated_at = now()
    WHERE id = v_payment.project_id;
  END IF;

  -- If Creator Pack, grant 5 credits to user profile
  IF v_payment.plan_type = 'creator_pack' AND v_payment.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET credits = credits + 5,
        updated_at = now()
    WHERE id = v_payment.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'approved');
END;
$$;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own non-sensitive profile info"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- PROJECTS POLICIES
CREATE POLICY "Users can view their own projects or admins can view all"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their own projects or admins can update all"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- PAYMENTS POLICIES
CREATE POLICY "Users can view own payments or admins can view all"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can submit payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Only admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROMO CODES POLICIES
CREATE POLICY "Anyone can view active promo codes metadata"
  ON public.promo_codes FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can modify promo codes"
  ON public.promo_codes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 9. PLATFORM CONFIGURATION & DYNAMIC SETTINGS (PHASE 4)
-- Allows the founder to dynamically update active bKash/Nagad numbers, payment types, and pricing from /admin.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow admin write of platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed Initial Default Payment Settings
INSERT INTO public.platform_settings (key, value)
VALUES (
  'payment_settings',
  '{
    "bkashNumber": "01712-345678",
    "bkashType": "Personal",
    "nagadNumber": "01912-345678",
    "nagadType": "Personal",
    "singlePriceBdt": 120,
    "creatorPackPriceBdt": 499
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 10. 24-HOUR AUTO-EXPIRY MAINTENANCE (POSTGRES / SUPABASE)
-- Can be called via pg_cron or Supabase Edge Function cron daily:
-- SELECT public.cleanup_expired_projects();
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_projects()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.projects
  WHERE expires_at < now()
    AND is_unlocked = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

