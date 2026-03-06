-- ==========================================================
-- QRGATE SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable RLS on core tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_guides ENABLE ROW LEVEL SECURITY;

-- 1. VENUE OWNER POLICIES
-- Owners should only be able to read and update their own venue and related data.
CREATE POLICY "Venue owners can manage their own venue"
    ON venues
    FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "Venue owners can manage their own tickets"
    ON tickets
    FOR ALL
    USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Venue owners can view their orders"
    ON orders
    FOR SELECT
    USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

CREATE POLICY "Venue owners can manage their audio guides"
    ON audio_guides
    FOR ALL
    USING (venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- 2. SCANNER / STAFF POLICIES
-- Scanners need to read specific tickets for a venue they are assigned to.
-- Assumes staff assignment via a `staff` or `scanner_roles` table.
CREATE POLICY "Scanners can verify tickets for their venue"
    ON orders
    FOR SELECT
    USING (
        venue_id IN (
            SELECT venue_id FROM staff_roles WHERE user_id = auth.uid() AND role = 'scanner'
        )
    );

-- 3. VISITOR SESSION POLICIES (For PWA Audio Guides)
-- Visitors possess a JWT containing their `session_token` and `venue_id`.
-- They only have read access to the specific active audio guide for their venue.
CREATE POLICY "Visitors can read guide if they have valid active session JWT"
    ON audio_guides
    FOR SELECT
    USING (
        venue_id = (current_setting('request.jwt.claims', true)::json->>'venue_id')::uuid
        AND status = 'published'
    );

-- 4. PUBLIC ACCESS
-- Public read access to active venues to allow listing/purchasing
CREATE POLICY "Anyone can view active venues details"
    ON venues
    FOR SELECT
    USING (status = 'active');

CREATE POLICY "Anyone can view active tickets"
    ON tickets
    FOR SELECT
    USING (
        venue_id IN (SELECT id FROM venues WHERE status = 'active')
        AND active = true
    );
