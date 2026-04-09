# Rust Belt Fibershed Map MVP

Mobile-first MVP platform for the Rust Belt Fibershed community. This repository currently includes:

- Supabase schema and RLS migrations
- Next.js app foundation with planned route structure
- API scaffolds for listings, profiles, contact relay, and Tally webhook intake

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill values.

3. Start development server:

```bash
npm run dev
```

## Implemented Routes (Scaffold)

- `/map`
- `/submit`
- `/submit/confirm`
- `/join`
- `/onboarding`
- `/profiles/[slug]`
- `/admin/submissions`

## Implemented API Endpoints (Scaffold)

- `GET /api/listings`
- `GET /api/profiles/[slug]`
- `POST /api/contact/relay`
- `POST /api/tally/webhook`
- `GET|PATCH /api/onboarding/draft`
- `POST /api/onboarding/submit`

## Database Migrations

Run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
