# Rust Belt Fibershed MVP - Implementation Status 3

Date: 2026-04-02

## Purpose
This document captures the latest implementation pass after `IMPLEMENTATION_STATUS_2.md`, including:
- City-only map rendering behavior
- Submission privacy control updates
- Verification completed
- Clarification of admin approval workflow
- Recommended next step for profile-first onboarding

## Summary Of Latest Delivery
Delivered in this pass:
1. City-only listings now render with city-center markers (when city coordinates can be inferred from approved exact listings in the same city/state).
2. Submission entry page now includes a location privacy selector and forwards the selected value to intake.
3. Listings API marker generation was consolidated to shared transformation logic to prevent coordinate regressions.
4. Compile regression in profile page was fixed.
5. Profile-first onboarding is now implemented with auth, draft save, and submit-for-approval workflow.

## Changes Implemented

### 1. City-only marker rendering strategy
Updated:
- `lib/mapbox/map-data.ts`
- `app/api/listings/route.ts`

Behavior:
- Build a per-city center map from approved listings that have exact `lat/lng`.
- For `location_privacy_level = city_only`, use derived city center coordinates.
- For `location_privacy_level = exact`, use exact `lat/lng`.
- Skip marker creation only when no valid coordinate source exists.

Result:
- Prevents NaN marker crashes and keeps city-only listings visible whenever city center data is available.

### 2. Submission privacy toggle
Updated:
- `app/submit/page.tsx`

Behavior:
- Added dropdown with:
  - Show exact location on map
  - Show city-level location only
- Selected value is appended to intake URL as `location_privacy_level`.

Backend compatibility:
- Tally intake endpoint already maps and stores `location_privacy_level` in `organizations`:
  - `app/api/tally/webhook/route.ts`

### 3. API and profile regression fix
Updated:
- `app/api/listings/route.ts`
- `app/profiles/[slug]/page.tsx`

Behavior:
- Listings route now uses shared map transformation (`toMapMarkerPayload`) for safer marker payloads.
- Profile page restored approved-only visibility check and removed invalid form usage that caused TS errors.

## Verification Completed
1. Type check passed:
   - `npm run -s typecheck`
2. Lint passed:
   - `npm run -s lint`
3. Functional verification by code path:
   - Approved exact listings render markers.
   - City-only listings render via city-center fallback when available.
   - Invalid or missing coordinates no longer crash map marker rendering.

## Admin Approval Workflow (Clarified)
Current workflow is fully implemented:
1. Intake creates organization in `pending` status and approval row in `submitted` status.
2. Admin queue shows `submitted` and `under_review` approvals.
3. Approve action updates:
   - `organizations.status -> approved`
   - `approvals.status -> approved`
   - assigns `profile_slug`
4. Reject action updates:
   - `organizations.status -> rejected`
   - `approvals.status -> rejected`
   - stores `rejection_reason`

Primary files:
- `app/admin/submissions/page.tsx`
- `app/admin/submissions/review-controls.tsx`
- `app/api/admin/submissions/[id]/route.ts`

## Profile-First Onboarding (Recommended Next)
Requested product direction:
- Users should be able to create an account/profile even without finalized business/location details.

Recommendation for next pass:
1. Add dedicated authenticated onboarding route (draft profile mode).
2. Allow minimal draft fields with status `pending` and non-public visibility.
3. Add completion step before approval submission (city/state/zip, consent, producer type).
4. Keep map publication gated on admin approval exactly as today.

Reason:
- Preserves strict public quality controls while reducing onboarding friction for early-stage participants.

## Remaining Risks / Gaps
1. City-only marker depends on at least one exact-coordinate listing in the same city/state.
2. If a city has only city-only members and no exact anchor listing yet, marker cannot be derived.
3. Join/sign-up currently uses email+password only; social and passwordless options are not included yet.

## Addendum: Profile-First Flow Implemented (2026-04-02)

### New routes
- `/join` for sign-up/sign-in before map submission.
- `/onboarding` for draft profile editing and explicit submit-for-review action.

### New APIs
- `GET|PATCH /api/onboarding/draft`
   - Loads draft profile for authenticated user.
   - Saves incomplete draft data safely while keeping listing non-public (`pending`).
- `POST /api/onboarding/submit`
   - Validates required fields + consent.
   - Creates or refreshes approval record with `submitted` status.
   - Keeps public map gating controlled by admin approval.

### New account navigation
- Global header now shows account actions across the app.
- Authenticated users see:
   - `My Profile` shortcut to `/onboarding`
   - `Sign out` action
- Guests see:
   - `Join / Sign In` shortcut to `/join`
- Account status chip now appears in header with states:
   - Guest
   - Pending Review
   - Approved
   - Needs Update (rejected)
   - Suspended
   - Archived

Files:
- `app/layout.tsx`
- `app/components/sign-out-button.tsx`
- `app/api/auth/signout/route.ts`
- `app/globals.css`

### Admin workflow impact
- No change required to admin UI or review endpoints.
- New onboarding submissions appear in existing admin queue because they write into the same `approvals` lifecycle.

### Important current limitation

Admin routes are functionally implemented, but there is no explicit request-level auth guard in these admin page/API files themselves; they rely on service-role access setup. You should add strict admin authentication/authorization middleware or checks before production hardening.

If you want, I can next map out a concrete Admin v2 checklist (access control, bulk actions, search/filter in queue, audit trail view, resend decision email, and status filters).