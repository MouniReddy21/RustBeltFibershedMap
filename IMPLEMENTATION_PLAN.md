## Plan: Rust Belt Fibershed MVP Platform

Build a mobile-first MVP in Next.js with Supabase and Mapbox that ships three core modules first: public map + synced directory, onboarding intake + admin approval, and public profile pages. Use Tally for fastest intake launch, keep consent and privacy controls first-class, and defer Exchange Board + analytics dashboard to post-MVP.

**Steps**
1. Phase 1 - Foundations and taxonomy model. ✅ SCHEMA COMPLETE
Define canonical taxonomy tables and enums for producer type, fibers/animals, dye plants/types, recycling services, general services, and community resources; include dedicated tags for waste wool and university/research affiliation. Create Supabase schema/migrations for listings/profiles and map-search indexes (location, category, text). SQL migrations ready: see `supabase/migrations/001_initial_schema.sql` (organizations, organization_profiles, approvals, contact_relay_emails, exchange_posts, tags, audit_log, settings tables with all 6 critical additions + RLS policies in 002_rls_policies.sql).
2. Phase 1 - Data security and visibility controls. *depends on 1*
Implement auth + authorization model with public read for approved listings, owner edit for own profile, and admin review controls. Add required consent flag for public visibility and contact visibility preferences with two explicit modes: public contact details (clickable links) or private contact (message button/form relay only, no direct email exposure). Store forwarded-message events for admin connection analytics.
3. Phase 1 - Ingestion pipeline (Tally-first). *depends on 1*
Implement Tally intake webhook/sync into pending records, normalize form responses into schema fields, store original payload snapshot for auditability, and notify admins of new submissions.
4. Phase 2 - Public map + synced directory UX. *depends on 1, parallel with 5 after shared APIs exist*
Build map page with color-coded markers by producer type, hover popup summary, and synchronized sidebar directory so map and list selections highlight each other. Add filter pills across all taxonomy categories, keyword/city/fiber search, and always-visible Submit a listing CTA.
5. Phase 2 - Listing and profile APIs. *depends on 1, parallel with 4*
Create APIs/query layer for approved listings, map-friendly payloads, profile detail payloads, and search/filter endpoints. Ensure response includes exchange-summary placeholders for future module compatibility.
6. Phase 2 - Public profile pages. *depends on 4 and 5*
Create profile routes with cleaned display of all approved form answers, mini-map location component, city/county display only for public location context, contact section that conditionally shows either public clickable contacts or a Send a message form relay, shareable link action, and owner-only edit button visibility.
7. Phase 3 - Admin review workflow. *depends on 2 and 3*
Build admin submission queue to review, approve/reject, and publish listings; include audit metadata and rejection reason capture. On approval, record publish timestamp and expose listing/profile publicly.
8. Phase 3 - Welcome confirmation moment. *depends on 3*
Create post-submission confirmation screen with mission-aligned welcome copy, optional donation CTA, and explore-map CTA. Keep donation fully optional and non-blocking.
9. Phase 4 - Mobile-first polish and accessibility. *depends on 4, 6*
Optimize map/list behavior for mobile (drawer or tab-toggle list/map), enforce touch targets and readable filter controls, and ensure keyboard/screen-reader access via non-map list equivalents.
10. Phase 4 - Deferred modules planning stub (not implemented in MVP).
Document and scaffold extension points for Exchange Board (including 90-day expiry/reminders) and internal analytics dashboard so post-MVP work reuses existing taxonomy and profile data model.

**Critical Schema Additions (All Implemented in 001_initial_schema.sql)**
| # | What | Table/Field | Purpose |
|---|------|-------------|---------|
| 1 | Message Relay Tracking | contact_relay_emails (NEW TABLE) | Log when platform relays messages between visitors/members; track delivery status; feed analytics on "connections made" |
| 2 | Exchange Board Full Schema | exchange_posts (NEW TABLE) | Complete table for phase 2: post_type, material_type, quantity, price_or_trade, posted_date, expires_date, renewal_reminded_date, status |
| 3 | Rejection Reason | approvals.rejection_reason (NEW FIELD) | Admin captures why submission was rejected for user feedback |
| 4 | Tally Audit Trail | approvals: intake_source, intake_source_id, intake_raw_response (NEW FIELDS) | Trace each form submission back to source, store raw payload for reprocessing if transform fails |
| 5 | Location Privacy Toggle | organizations.location_privacy_level (NEW FIELD) | Enum (exact \| city_only) allows members to hide exact coordinates on public map if preferred |
| 6 | Confirmation Records | approvals: confirmation_at, donation_status, donation_amount (NEW FIELDS) | Track onboarding completion funnel (submitted → approved → welcomed → donated?); feeds engagement metrics |

**Relevant files**
- `supabase/migrations/001_initial_schema.sql` — SCHEMA FOUNDATION (complete, ready to run). See 6 critical additions above.
- `supabase/migrations/002_rls_policies.sql` — ROW-LEVEL SECURITY (complete, ready to run).
- `app/map/page.tsx` — unified map + synced directory experience.
- `app/profiles/[slug]/page.tsx` — public profile page.
- `app/submit/page.tsx` — submission entry point.
- `app/submit/confirm/page.tsx` — warm confirmation screen + donation.
- `app/admin/submissions/page.tsx` — admin approval queue.
- `app/api/tally/webhook/route.ts` — Tally ingestion.
- `app/api/listings/route.ts` — public listings API.
- `app/api/profiles/[slug]/route.ts` — profile API with visibility-aware contact fields.
- `app/api/contact/relay/route.ts` — message relay API (NEW for phase 1).
- `lib/supabase/server.ts` — server client and role-aware data access.
- `lib/mapbox/map-data.ts` — marker transformation and color mapping.

**Decisions**
- Included in MVP: public map + synced directory, onboarding + admin approval, public profile pages.
- Excluded from MVP: Exchange Board active operations and admin analytics dashboard (schema defined; feature deferred to phase 2).
- Intake path: Tally-first for rapid launch. Audit trail captures: intake_source, intake_source_id, intake_raw_response (full payload snapshot) for traceability.
- Contact privacy: private mode is message-button-only; platform relays message via contact_relay_emails table, delivers to member email, and direct email is never exposed publicly or in API responses.
- Message relay analytics: non-PII connection events logged to contact_relay_emails (sender, delivery status, timestamp) for Sarah's team to track "real connections made through platform."
- Renewal policy for future Exchange Board: 90-day expiry with reminder email. Schema complete with renewal_reminded_date, auto-expiry logic via PG funcs (implemented in phase 2).
- Public location policy: show city/county context always; location_privacy_level enum (exact | city_only) allows members to hide exact coordinates if preferred.
- Consent requirement: required boolean field; gates all public profile visibility.
- Rejection tracking: rejection_reason field on approvals table for admin-to-user feedback.
- Confirmation funnel: confirmation_at, donation_status (skipped|completed), donation_amount tracked on approvals for engagement metrics.

**Verification**
1. Run DB migration checks and policy tests to confirm public can read only approved listings and owners can edit only their records.
2. Validate Tally intake path end-to-end: submit form -> pending admin queue entry -> approval -> public map/profile visibility.
3. Test map/directory sync behavior on desktop and mobile.
4. Validate filters and search including waste wool and university/research filters.
5. Confirm consent gate works: non-consented data never publishes.
6. Confirm contact privacy behavior: public mode = clickable channels; private mode = Send message form relay only.
7. Validate message forwarding pipeline: form → platform relay → member inbox → logged to contact_relay_emails.
8. Accessibility checks: keyboard navigation, screen-reader summaries, mobile touch targets.

**Further Considerations**
1. Schema deployment: Run migrations in order (001, then 002) in Supabase staging first.
2. Admin JWT claim: Supabase auth needs custom claim `is_admin: true` for admin RLS policies.
3. Bioregion calculation: Auto-triggers via PG function using earth_distance extension (requires `CREATE EXTENSION cube` + `CREATE EXTENSION earthdistance`).
4. Exchange Board moderation: Phase 2 should revalidate and shift from public posting to approved-member posting before launch.
5. Taxonomy governance: Assign admin owner for tag curation to prevent sprawl.
6. Phase 2 scope: Exchange posts lifecycle (90-day expiry job, renewal reminders via Resend, auto-expiry, admin dashboards).