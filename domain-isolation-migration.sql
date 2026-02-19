-- ============================================================
-- Domain Isolation + Realtime Migration
-- Run in Supabase SQL Editor AFTER the initial migration
-- ============================================================

-- 1. Add email_domain column for explicit domain scoping
ALTER TABLE audits ADD COLUMN IF NOT EXISTS email_domain TEXT;

-- 2. Add last_edited_by to track who made the most recent edit
ALTER TABLE audits ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id);

-- 3. Backfill email_domain from existing rows
UPDATE audits
SET email_domain = split_part(user_email, '@', 2)
WHERE email_domain IS NULL AND user_email IS NOT NULL;

-- 4. Trigger: auto-set email_domain whenever user_email changes
CREATE OR REPLACE FUNCTION set_audit_email_domain() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_email IS NOT NULL THEN
        NEW.email_domain := split_part(NEW.user_email, '@', 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_audit_email_domain_trigger ON audits;
CREATE TRIGGER set_audit_email_domain_trigger
    BEFORE INSERT OR UPDATE OF user_email ON audits
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_email_domain();

-- 5. Index on email_domain for fast lookups
CREATE INDEX IF NOT EXISTS idx_audits_email_domain ON audits(email_domain);

-- 6. Partial unique index: ONE draft per domain (prevents race condition duplicates)
--    If duplicates already exist, keep the most recently updated one and delete the rest:
DO $$
DECLARE
    dup RECORD;
BEGIN
    FOR dup IN
        SELECT email_domain, array_agg(id ORDER BY updated_at DESC) AS ids
        FROM audits
        WHERE status = 'draft' AND email_domain IS NOT NULL
        GROUP BY email_domain
        HAVING COUNT(*) > 1
    LOOP
        -- Delete all but the most recently updated draft for this domain
        DELETE FROM audits WHERE id = ANY(dup.ids[2:]);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_domain_draft
    ON audits (email_domain) WHERE status = 'draft';

-- 7. Update domain RLS policies to use the indexed email_domain column
DROP POLICY IF EXISTS "domain_audits_select" ON audits;
CREATE POLICY "domain_audits_select" ON audits FOR SELECT
    USING (
        email_domain = split_part(
            (SELECT email FROM auth.users WHERE id = auth.uid()), '@', 2
        )
    );

DROP POLICY IF EXISTS "domain_audits_update" ON audits;
CREATE POLICY "domain_audits_update" ON audits FOR UPDATE
    USING (
        email_domain = split_part(
            (SELECT email FROM auth.users WHERE id = auth.uid()), '@', 2
        )
    );

DROP POLICY IF EXISTS "domain_team_select" ON audit_team_members;
CREATE POLICY "domain_team_select" ON audit_team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = audit_id
            AND audits.email_domain = split_part(
                (SELECT email FROM auth.users WHERE id = auth.uid()), '@', 2
            )
        )
    );

-- 8. Enable Supabase Realtime on audits table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE audits;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- already added
END $$;
