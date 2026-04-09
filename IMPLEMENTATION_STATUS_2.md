# Rust Belt Fibershed MVP - Implementation Status 2 (Delta)

Date: 2026-04-01

## Purpose
This document captures the **newly implemented work only** after the prior status report. It focuses on:
- Features delivered in this pass
- How implementation was done
- Issues encountered and how they were resolved
- Decisions made during implementation
- Testing executed and current verification status

## Summary Of New Delivery
This pass implemented the next major functional layer:
1. Public profile pages with real data rendering and privacy-aware contact behavior
2. Exchange Board foundation (public listing page + APIs for post lifecycle)
3. Admin submission review workflow (queue + approve/reject actions)
4. Exchange summary integration into existing listings/profile APIs

## New Features Delivered

### 1. Real Profile Page Experience
Implemented in:
- app/profiles/[slug]/page.tsx
- app/profiles/[slug]/relay-form.tsx
- app/api/profiles/[slug]/route.ts

Delivered:
- Loads approved organization by slug and renders actual profile content
- Displays location context with privacy behavior:
  - `exact`: coordinate context available
  - `city_only`: city/county-only context messaging
- Displays active exchange posts on the profile
- Contact behavior by visibility mode:
  - Public mode: clickable website/instagram/phone links
  - Private mode: message relay form posting to existing relay endpoint
- Exchange summary is now computed from actual active posts

### 2. Exchange Board Foundation
Implemented in:
- app/exchange/page.tsx
- app/api/exchange/posts/route.ts
- app/api/exchange/posts/[id]/route.ts
- app/page.tsx (entry link)
- lib/types.ts (new exchange types)

Delivered:
- New public Exchange Board page with filters:
  - keyword query
  - post type (`offering` / `wanted`)
- Public API to list active exchange posts
- Authenticated owner API to create exchange posts
- Authenticated owner API to update/delete own posts
- Link path from Home to Exchange Board

### 3. Admin Review Queue (Actionable)
Implemented in:
- app/admin/submissions/page.tsx
- app/admin/submissions/review-controls.tsx
- app/api/admin/submissions/route.ts
- app/api/admin/submissions/[id]/route.ts

Delivered:
- Admin queue now loads pending submissions from `approvals`
- Approve action:
  - updates approval status to approved
  - updates organization status to approved
  - sets approval timestamps
  - creates profile slug when missing
- Reject action:
  - requires rejection reason
  - writes rejection reason and status to approvals
  - updates organization status to rejected

### 4. Listings API Exchange Integration
Implemented in:
- app/api/listings/route.ts

Delivered:
- `exchange_summary` values (`offering_count`, `wanted_count`) are now computed from active `exchange_posts` grouped by organization

## How We Implemented (Technical Approach)

### Profile + Contact Relay
- Used server-side Supabase client for profile page data fetches
- Reused existing relay API (`/api/contact/relay`) instead of creating a second relay path
- Added a focused client component for relay form submission to keep page logic clean

### Exchange Board APIs
- Added Zod validation for create/update payload safety
- Used authenticated user lookup (`supabase.auth.getUser`) to map request to owner organization
- Scoped update/delete by both post id and owner organization id for ownership protection
- Kept page read path public and write paths authenticated

### Admin Workflow
- Added server API for queue retrieval and action API for review decisions
- Used admin Supabase client for controlled status transitions
- Added simple, reliable slug generation fallback for approved organizations
- Kept UI lightweight with client-side review controls for approve/reject actions

## Issues Encountered And Resolutions

### Issue 1: JSX lint failure for unescaped quotes
Symptom:
- Build failed on Exchange page due to `react/no-unescaped-entities`.

Resolution:
- Replaced quote characters with HTML entities (`&quot;`) in JSX content.

### Issue 2: Build-time prerender failure for admin route
Symptom:
- `/admin/submissions` failed during prerender when admin env vars were not configured.

Resolution:
- Marked admin page dynamic (`force-dynamic`).
- Added runtime guard around admin client creation and fallback to empty queue when env vars are absent.

Result:
- Production build completes successfully in local environment.

## Key Decisions Made

1. Implemented Exchange Board now as a foundational, working layer (read + owner CRUD APIs), while keeping advanced lifecycle automation for next pass.
2. Reused existing relay infrastructure for privacy mode instead of introducing duplicate contact channels.
3. Used service-role-backed admin route handling to unlock immediate workflow progress; explicit admin-gating hardening is deferred as a near-term follow-up.
4. Kept UI intentionally minimal but functional to prioritize end-to-end behavior and correctness before visual polish.

## Testing Executed

### Automated checks run
1. `npm run typecheck` -> pass
2. `npm run build` -> pass (after fixes)

### Build verification highlights
- Next.js app routes and API routes compile
- New routes included in successful build output:
  - `/exchange`
  - `/api/exchange/posts`
  - `/api/exchange/posts/[id]`
  - `/api/admin/submissions`
  - `/api/admin/submissions/[id]`
  - `/profiles/[slug]`

### Functional behavior validated in code path
- Profile page now fetches and renders approved data
- Relay form submits to contact relay endpoint
- Exchange listing/filter path works server-side
- Admin approval/rejection writes to approvals + organizations
- Listings exchange summary reflects active exchange rows

## Current Gaps After This Pass
1. Admin auth hardening (explicit claim/session guard) on admin APIs/pages
2. Owner-facing Exchange post management UI screens (currently API-ready)
3. Exchange auto-expiry + reminder scheduling (90-day lifecycle automation)
4. Internal analytics dashboard screens for Fibershed team insights
5. Manual browser-based end-to-end verification with staged Supabase data

## Recommended Immediate Next Step
Implement owner-facing Exchange post management UI (create/edit/delete forms) against the new exchange APIs, then add admin auth hardening before production exposure.

# importatn notes
Admin APIs/pages currently use service-role access and are not yet hardened with explicit admin-auth gating. This is fine for internal MVP iteration but should be locked down before production exposure.

---

## Update 2: Recent Changes (Owner Exchange UI + Expiry Job + Analytics)

Date: 2026-04-01

### Scope Added In This Update
1. Owner-facing Exchange Board management UI (create/edit/delete/close/reopen)
2. 90-day exchange maintenance job wiring (auto-expiry + reminder emails via Resend)
3. Internal analytics dashboard route for supply/demand and regional gap insights

### New Files And Routes Added

Owner Exchange management:
- app/exchange/manage/page.tsx
- app/exchange/manage/ui.tsx

Scheduled maintenance and email wiring:
- app/api/jobs/exchange-maintenance/route.ts
- lib/email/resend.ts
- vercel.json
- .env.example (new vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`)

Analytics dashboard:
- app/admin/analytics/page.tsx

Navigation updates:
- app/exchange/page.tsx ("Manage your posts" CTA)
- app/admin/submissions/page.tsx (link to analytics dashboard)

### Step-By-Step: How This Was Implemented

Step 1. Added owner Exchange management route and auth-aware loading.
- Created server page at `/exchange/manage`.
- Loaded authenticated user and mapped to organization.
- Loaded existing exchange posts for that owner.

Step 2. Built owner CRUD interface.
- Added client UI for:
  - create post
  - edit post
  - close/reopen post
  - delete post
- Wired UI to existing APIs:
  - `POST /api/exchange/posts`
  - `PATCH /api/exchange/posts/[id]`
  - `DELETE /api/exchange/posts/[id]`

Step 3. Added scheduled maintenance endpoint.
- Implemented `GET /api/jobs/exchange-maintenance` with secret-based auth.
- Added two maintenance actions:
  - expire old active posts (`expires_at < now` -> `status = expired`)
  - reminder pipeline for posts expiring in next 7 days with null `renewal_reminded_at`

Step 4. Wired Resend email sending utility.
- Added a reusable helper in `lib/email/resend.ts`.
- Job calls Resend API and records reminder timestamps only on successful send.

Step 5. Added scheduler configuration.
- Added `vercel.json` cron entry to run daily against `/api/jobs/exchange-maintenance`.

Step 6. Added internal analytics dashboard route.
- Implemented `/admin/analytics` with server-side aggregation from Supabase.
- Added KPI and insight panels:
  - approved listings
  - active exchange posts
  - waste wool and university counts
  - producer type distribution
  - exchange supply and demand top categories
  - county-level farmer-without-mill gap list

Step 7. Added cross-route entry points.
- Linked Exchange page to `/exchange/manage`.
- Linked Admin Submissions page to `/admin/analytics`.

Step 8. Verified compile/test status.
- Ran `npm run typecheck`.
- Ran `npm run build` and confirmed new routes were included and successful.

### Problems / Issues Encountered And How They Were Solved

Issue A: PATCH payload mismatch from owner UI to API.
- Problem: edit flow initially sent `postType` in PATCH body, but PATCH schema did not allow it.
- Impact: potential update failures for edited posts.
- Solution: split payload logic:
  - POST includes `postType`
  - PATCH excludes `postType` and sends update-safe fields only.

Issue B: Admin/service-role env dependency during server-rendered pages.
- Problem: admin-style pages can fail if service-role env vars are missing.
- Impact: runtime or build instability in misconfigured environments.
- Solution: preserved dynamic rendering/runtime-guard approach for admin pages and used defensive fallbacks where admin client creation can fail.

Issue C: Reminder job security concerns for public endpoint access.
- Problem: maintenance endpoint should not be callable anonymously.
- Impact: risk of unauthorized job execution.
- Solution: added `CRON_SECRET` verification via Authorization bearer token or `x-cron-secret` header.

Issue D: Reliable reminder deduping.
- Problem: reminder emails should not resend repeatedly each run.
- Impact: duplicate reminder emails and member noise.
- Solution: query only rows with `renewal_reminded_at IS NULL`, and set `renewal_reminded_at` after successful sends.

### Key Decisions In This Update
1. Reused existing Exchange APIs for owner UI instead of creating duplicate management-specific endpoints.
2. Used lightweight in-route aggregation for analytics to deliver insight quickly before introducing a dedicated analytics service layer.
3. Chose daily cron cadence for maintenance as MVP-safe default.
4. Protected job route with shared secret first; full platform-level admin hardening remains a follow-up.

### Testing Done For This Update

Automated:
1. `npm run typecheck` -> pass
2. `npm run build` -> pass

Build output confirmation included new routes:
- `/exchange/manage`
- `/api/jobs/exchange-maintenance`
- `/admin/analytics`

Functional checks validated in code path:
- owner create/edit/delete/close/reopen flows are wired to APIs
- exchange maintenance route handles expiry and reminder candidate processing
- reminder timestamp writeback prevents duplicate sends
- analytics route renders supply/demand and regional gap summaries

### Remaining Follow-ups After This Update
1. Add explicit admin auth/claim gating on admin pages and admin APIs.
2. Add manual-run UI card for maintenance endpoint in admin tools.
3. Add provider-status logging for reminder sends (e.g., message ids in audit log if needed).

### additional notes
Admin APIs/pages currently use service-role access and are not yet hardened with explicit admin-auth gating. This is fine for internal MVP iteration but should be locked down before production exposure.