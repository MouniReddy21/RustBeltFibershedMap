# Rust Belt Fibershed MVP - Stakeholder Handoff (One Page)

Date: 2026-04-01

## What this platform is for
The Rust Belt Fibershed MVP connects farmers, mills, designers, makers, researchers, and community members across the Ohio-centered bioregion.

It delivers three core capabilities:
1. Public discovery map and directory
2. Onboarding intake and approval workflow foundation
3. Public profile and contact architecture with privacy controls

## What is live in the codebase now

### Public map and directory
- Interactive Mapbox map with real map tiles
- Color-coded producer markers
- Hover and selected popups
- Directory cards synced with map marker selection
- Search and filtering by:
  - keyword
  - city
  - fiber type
  - producer type
  - waste wool
  - university and research
- Mobile map/list toggle for phone usability

### Privacy and trust
- Consent and visibility model is present in schema and API behavior
- Location privacy supports exact vs city-level display
- Contact privacy supports relay-only mode architecture
- Contact relay logging table is included for connection analytics

### API foundation
- Listings API with filter/search support
- Profile API with privacy-aware contact shaping
- Contact relay API scaffold
- Tally webhook ingestion scaffold for pending submissions

### Accessibility baseline in map experience
- Keyboard-operable map and directory selection flows
- Visible keyboard focus styles
- ARIA live announcements when active listing changes
- Higher-contrast selected states

## What is complete vs in progress

### Complete
- App foundation and route structure
- Supabase schema and RLS migration files
- First production-ready map-directory pass
- UX and accessibility improvements for map-directory
- Build and typecheck passing

### In progress / next
- Admin queue actions (approve/reject) and full moderation flow
- Full profile page rendering from approved records
- End-to-end webhook and approval validation with live staging data

## Key implementation decisions already honored
1. Waste wool is supported as a dedicated filter signal.
2. University/research is supported as a dedicated filter signal.
3. Consent and visibility controls are first-class in architecture.
4. Mobile-first usability is implemented in the map-directory interface.
5. Exchange board schema exists now; full active board operations remain a later phase decision.

## Current risks and dependencies
1. Real integration testing with staging Supabase data is still needed.
2. Tally webhook payload mapping should be validated with real submissions.
3. Email relay delivery pipeline should be validated with provider credentials.
4. Workspace is not currently a git repository, so versioned change history is not yet available.

## Verification snapshot
- npm install: pass
- npm run typecheck: pass
- npm run build: pass

## Recommended immediate next milestone
Implement and validate the admin review flow end-to-end:
1. Pending submissions list
2. Approve/reject action handlers
3. Rejection reason capture
4. Publish visibility transition to map/profile on approval
5. Audit logging confirmation

## Stakeholder takeaway
The MVP foundation is solid and already demonstrates the core discovery experience (map + synced directory) with strong privacy intent and accessibility improvements. The highest-value next step is finishing the approval workflow so real community onboarding can move from intake to visible public listings safely.
