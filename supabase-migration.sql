-- ============================================================
-- Agency Operators Audit Frontend - Supabase Migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/zhhikvjopuylxuxbbedg/sql)
-- ============================================================

-- 1. Profiles table (auto-created on sign-in via trigger)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Audits table (form submissions)
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    user_name TEXT,
    user_email TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    completion_percentage INTEGER DEFAULT 0,
    section_completion JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Team members (extracted from form_data via trigger)
CREATE TABLE IF NOT EXISTS audit_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
    member_name TEXT,
    position TEXT,
    compensation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_team_members_audit_id ON audit_team_members(audit_id);

-- 5. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_team_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Profiles
CREATE POLICY "own_profile" ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "admin_profiles" ON profiles FOR SELECT
    USING (
        (auth.jwt() ->> 'email') LIKE '%@builderbenai.com'
        OR (auth.jwt() ->> 'email') LIKE '%@agencyoperators.io'
    );

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 7. RLS Policies - Audits
CREATE POLICY "own_audits_select" ON audits FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "admin_audits_select" ON audits FOR SELECT
    USING (
        (auth.jwt() ->> 'email') LIKE '%@builderbenai.com'
        OR (auth.jwt() ->> 'email') LIKE '%@agencyoperators.io'
    );

CREATE POLICY "insert_own_audit" ON audits FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_audit" ON audits FOR UPDATE
    USING (user_id = auth.uid());

-- 8. RLS Policies - Team Members
CREATE POLICY "own_team_select" ON audit_team_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM audits WHERE audits.id = audit_id AND audits.user_id = auth.uid()));

CREATE POLICY "admin_team_select" ON audit_team_members FOR SELECT
    USING (
        (auth.jwt() ->> 'email') LIKE '%@builderbenai.com'
        OR (auth.jwt() ->> 'email') LIKE '%@agencyoperators.io'
    );

-- 9. Trigger: sync team members from JSONB on audit insert/update
CREATE OR REPLACE FUNCTION sync_team_members() RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM audit_team_members WHERE audit_id = NEW.id;
    IF jsonb_typeof(COALESCE(NEW.form_data->'operations'->'team_members', 'null'::jsonb)) = 'array' THEN
        INSERT INTO audit_team_members (audit_id, member_name, position, compensation)
        SELECT NEW.id, m->>'team_member', m->>'position', m->>'pay'
        FROM jsonb_array_elements(NEW.form_data->'operations'->'team_members') m
        WHERE m->>'team_member' IS NOT NULL AND m->>'team_member' != '';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_team_members_on_insert
    AFTER INSERT ON audits
    FOR EACH ROW
    EXECUTE FUNCTION sync_team_members();

CREATE TRIGGER sync_team_members_on_update
    AFTER UPDATE ON audits
    FOR EACH ROW
    WHEN (OLD.form_data IS DISTINCT FROM NEW.form_data)
    EXECUTE FUNCTION sync_team_members();

-- 10. Trigger: auto-create profile on auth sign-up
-- Uses ON CONFLICT + EXCEPTION handler so trigger failure never blocks user creation
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM profiles WHERE email = NEW.email AND id != NEW.id;

    INSERT INTO profiles (id, email, full_name, avatar_url, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email LIKE '%@builderbenai.com' OR NEW.email LIKE '%@agencyoperators.io'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: % %', NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 11. Domain-scoped RLS policies (same email domain = shared audit access)
-- These work alongside existing user_id-based policies (Postgres ORs multiple policies)

CREATE POLICY "domain_audits_select" ON audits FOR SELECT
    USING (
        split_part(user_email, '@', 2) = split_part(
            (auth.jwt() ->> 'email'), '@', 2
        )
    );

CREATE POLICY "domain_audits_update" ON audits FOR UPDATE
    USING (
        split_part(user_email, '@', 2) = split_part(
            (auth.jwt() ->> 'email'), '@', 2
        )
    );

CREATE POLICY "domain_team_select" ON audit_team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = audit_id
            AND split_part(audits.user_email, '@', 2) = split_part(
                (auth.jwt() ->> 'email'), '@', 2
            )
        )
    );

-- ============================================================
-- MIGRATION: Merge Org Chart + Team Members (2026-02-27)
-- Run this in Supabase SQL Editor AFTER initial schema exists
-- ============================================================

-- Add new columns to audit_team_members
ALTER TABLE audit_team_members ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE audit_team_members ADD COLUMN IF NOT EXISTS ranking TEXT;

-- Update trigger to extract from new unified team_members keys
CREATE OR REPLACE FUNCTION sync_team_members() RETURNS TRIGGER
SECURITY DEFINER AS $$
BEGIN
    DELETE FROM audit_team_members WHERE audit_id = NEW.id;
    IF jsonb_typeof(COALESCE(NEW.form_data->'operations'->'team_members', 'null'::jsonb)) = 'array' THEN
        INSERT INTO audit_team_members (audit_id, member_name, position, compensation, reports_to, ranking)
        SELECT NEW.id,
            COALESCE(m->>'name', m->>'team_member'),
            m->>'position',
            COALESCE(m->>'salary', m->>'pay'),
            m->>'reports_to',
            m->>'ranking'
        FROM jsonb_array_elements(NEW.form_data->'operations'->'team_members') m
        WHERE COALESCE(m->>'name', m->>'team_member') IS NOT NULL
          AND COALESCE(m->>'name', m->>'team_member') != '';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
