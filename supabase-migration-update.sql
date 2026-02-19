-- ============================================================
-- Agency Operators Audit Frontend - Migration UPDATE
-- Run this in Supabase SQL Editor to apply edge-case fixes
-- Only updates functions + triggers (tables/policies unchanged)
-- ============================================================

-- 1. Fix handle_new_user: delete stale profile on email collision
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix sync_team_members: guard against non-array JSON
CREATE OR REPLACE FUNCTION sync_team_members() RETURNS TRIGGER AS $$
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

-- 3. Recreate triggers: INSERT always fires, UPDATE only when form_data changes
DROP TRIGGER IF EXISTS sync_team_members_trigger ON audits;
DROP TRIGGER IF EXISTS sync_team_members_on_insert ON audits;
DROP TRIGGER IF EXISTS sync_team_members_on_update ON audits;

CREATE TRIGGER sync_team_members_on_insert
    AFTER INSERT ON audits
    FOR EACH ROW
    EXECUTE FUNCTION sync_team_members();

CREATE TRIGGER sync_team_members_on_update
    AFTER UPDATE ON audits
    FOR EACH ROW
    WHEN (OLD.form_data IS DISTINCT FROM NEW.form_data)
    EXECUTE FUNCTION sync_team_members();
