-- ============================================================
-- LedgerLearn Pro — Supabase Database Setup
-- ============================================================
-- HOW TO USE:
--   1. Go to supabase.com → New project
--   2. Wait for project to provision (~2 minutes)
--   3. Go to SQL Editor (left sidebar)
--   4. Paste this entire script and click Run
--   5. Everything is created automatically
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLE 1: profiles
-- Extends Supabase auth.users with LedgerLearn-specific data.
-- Created automatically when a user registers.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL DEFAULT '',
  email           TEXT        UNIQUE NOT NULL,
  region          TEXT        NOT NULL DEFAULT 'UK',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profile data extending Supabase auth';


-- ============================================================
-- TABLE 2: progress
-- One row per user. Stores all learning progress.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.progress (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,

  -- Level completion
  completed_levels    TEXT[]      NOT NULL DEFAULT '{}',
  completed_lessons   INTEGER[]   NOT NULL DEFAULT '{}',

  -- Scores
  l1_score            INTEGER,
  l2_score            INTEGER,
  l3_score            INTEGER,
  last_score          INTEGER,

  -- Lesson progress per level
  l1_lessons_done     INTEGER     NOT NULL DEFAULT 0,
  l2_lessons_done     INTEGER     NOT NULL DEFAULT 0,
  l3_lessons_done     INTEGER     NOT NULL DEFAULT 0,

  -- Practice stats
  practice_attempted  INTEGER     NOT NULL DEFAULT 0,
  practice_correct    INTEGER     NOT NULL DEFAULT 0,

  -- Payment
  paid_l2             BOOLEAN     NOT NULL DEFAULT FALSE,
  paid_l3             BOOLEAN     NOT NULL DEFAULT FALSE,
  paypal_sub_l2       TEXT,
  paypal_sub_l3       TEXT,

  -- Misc
  placement_result    TEXT,
  cert_id             TEXT,
  issue_date          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(email)
);

COMMENT ON TABLE public.progress IS 'User learning progress, scores, and payment status';


-- ============================================================
-- TABLE 3: certificates
-- One row per certificate issued. Immutable record.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,

  cert_id             TEXT        NOT NULL UNIQUE,  -- e.g. LL-2026-A1B2C3
  candidate_name      TEXT        NOT NULL,
  cert_title          TEXT        NOT NULL,         -- "Xero Certified Practitioner — Level 1"
  cert_level          TEXT        NOT NULL,         -- "L1 · Xero Associate · ..."
  cert_region         TEXT        NOT NULL DEFAULT 'UK',
  cert_region_label   TEXT        NOT NULL DEFAULT 'United Kingdom',
  cert_region_suffix  TEXT,
  score               INTEGER     NOT NULL,
  level               TEXT        NOT NULL,         -- 'l1' | 'l2' | 'l3'
  issue_date          TEXT        NOT NULL,
  verified            BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.certificates IS 'Immutable record of all issued certificates';
CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON public.certificates(cert_id);
CREATE INDEX IF NOT EXISTS idx_certificates_email   ON public.certificates(email);


-- ============================================================
-- TABLE 4: payments
-- Records every confirmed PayPal payment.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  email           TEXT        NOT NULL,
  subscription_id TEXT        NOT NULL,
  plan_id         TEXT        NOT NULL,
  level           TEXT        NOT NULL,   -- 'l2' | 'l3'
  amount_usd      NUMERIC(8,2),
  status          TEXT        NOT NULL DEFAULT 'confirmed',
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'PayPal payment records';
CREATE INDEX IF NOT EXISTS idx_payments_email ON public.payments(email);
CREATE INDEX IF NOT EXISTS idx_payments_sub   ON public.payments(subscription_id);


-- ============================================================
-- TABLE 5: partners
-- Partner program applications.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution     TEXT        NOT NULL,
  contact_name    TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT,
  org_type        TEXT,
  country         TEXT,
  students_range  TEXT,
  website         TEXT,
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  commission_pct  INTEGER     NOT NULL DEFAULT 20,
  referral_code   TEXT        UNIQUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.partners IS 'Partner program applications and accounts';


-- ============================================================
-- TABLE 6: affiliates
-- Affiliate accounts and commission tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  commission_pct  INTEGER     NOT NULL DEFAULT 20,
  referral_code   TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  pay_ref         TEXT,       -- PayPal email or bank ref
  referrals       INTEGER     NOT NULL DEFAULT 0,
  revenue_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_pending NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.affiliates IS 'Affiliate accounts and commission tracking';


-- ============================================================
-- TABLE 7: manual_upgrades
-- Admin-granted level upgrades (without payment).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.manual_upgrades (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT        NOT NULL,
  level       TEXT        NOT NULL,   -- 'l2' | 'l3' | 'both'
  reason      TEXT,
  note        TEXT,
  granted_by  TEXT        NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.manual_upgrades IS 'Admin-granted level upgrades without payment';
CREATE INDEX IF NOT EXISTS idx_upgrades_email ON public.manual_upgrades(email);


-- ============================================================
-- TABLE 8: erp_leads
-- ERP Academy email captures.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.erp_leads (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT        NOT NULL UNIQUE,
  source      TEXT        NOT NULL DEFAULT 'erp-academy-page',
  invited     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.erp_leads IS 'ERP Academy email captures';


-- ============================================================
-- TRIGGERS — updated_at auto-maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at  ON public.profiles;
DROP TRIGGER IF EXISTS trg_progress_updated_at  ON public.progress;
DROP TRIGGER IF EXISTS trg_partners_updated_at  ON public.partners;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- TRIGGER — auto-create profile on auth.users insert
-- Fires every time a new user registers via Supabase Auth.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, region)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'region', 'UK')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.progress (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only read/write their own data.
-- Service role (used by Netlify functions) bypasses RLS.
-- ============================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upgrades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_leads        ENABLE ROW LEVEL SECURITY;

-- profiles: user reads/updates own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- progress: user reads/updates own row
CREATE POLICY "progress_select_own" ON public.progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON public.progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON public.progress
  FOR UPDATE USING (auth.uid() = user_id);

-- certificates: user reads own, anyone can verify by cert_id
CREATE POLICY "certs_select_own" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "certs_verify_public" ON public.certificates
  FOR SELECT USING (TRUE);  -- public cert verification

-- payments: user reads own
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- partners/affiliates: authenticated users can insert (apply)
CREATE POLICY "partners_insert_any" ON public.partners
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "affiliates_select_own" ON public.affiliates
  FOR SELECT USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- erp_leads: anyone can insert
CREATE POLICY "erp_leads_insert_any" ON public.erp_leads
  FOR INSERT WITH CHECK (TRUE);

-- manual_upgrades: service role only (no user policy)


-- ============================================================
-- HELPER VIEWS (useful in admin panel)
-- ============================================================

-- Full user summary for admin
CREATE OR REPLACE VIEW public.admin_user_summary AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.region,
  p.created_at                                          AS registered_at,
  pr.completed_levels,
  pr.l1_score,
  pr.l2_score,
  pr.l3_score,
  pr.paid_l2,
  pr.paid_l3,
  pr.l1_lessons_done,
  pr.l2_lessons_done,
  pr.l3_lessons_done,
  pr.practice_attempted,
  pr.practice_correct,
  (SELECT COUNT(*) FROM public.certificates c WHERE c.user_id = p.id) AS cert_count
FROM public.profiles p
LEFT JOIN public.progress pr ON pr.user_id = p.id
ORDER BY p.created_at DESC;

COMMENT ON VIEW public.admin_user_summary IS 'Full user summary for admin panel';

-- Revenue summary
CREATE OR REPLACE VIEW public.admin_revenue_summary AS
SELECT
  DATE_TRUNC('month', created_at)         AS month,
  COUNT(*)                                 AS payments,
  SUM(COALESCE(amount_usd, 49))           AS revenue_usd,
  COUNT(DISTINCT email)                    AS unique_payers
FROM public.payments
WHERE status = 'confirmed'
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.admin_revenue_summary IS 'Monthly revenue summary';

-- Certificate leaderboard
CREATE OR REPLACE VIEW public.cert_leaderboard AS
SELECT
  candidate_name,
  cert_title,
  cert_region_label  AS region,
  score,
  level,
  issue_date,
  cert_id
FROM public.certificates
ORDER BY score DESC, created_at DESC
LIMIT 100;

COMMENT ON VIEW public.cert_leaderboard IS 'Top certificate scores';


-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_progress_user_id     ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_email        ON public.progress(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_certs_user_id         ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id      ON public.payments(user_id);


-- ============================================================
-- DONE
-- ============================================================
-- After running this script you will have:
--   ✓ 8 tables fully configured
--   ✓ Row Level Security on all tables
--   ✓ Auto profile+progress creation on signup
--   ✓ updated_at triggers
--   ✓ 3 admin views
--   ✓ Performance indexes
--   ✓ Public certificate verification
--
-- Next step: Add these to Netlify environment variables:
--   SUPABASE_URL        = https://xxxx.supabase.co
--   SUPABASE_ANON_KEY   = eyJhbGci...  (safe for frontend)
--   SUPABASE_SERVICE_KEY = eyJhbGci... (server-side only, never expose)
-- ============================================================
