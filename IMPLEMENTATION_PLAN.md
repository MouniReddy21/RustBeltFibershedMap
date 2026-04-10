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

Suggested Features                                                                                                  
                                                                                                                        
  1. Interactive map legend with category filter pills — click a category icon on the home page to jump to the map
  pre-filtered by that type                                                                                             
  2. Bioregional stats banner — "X farmers, Y mills, Z makers across the Rust Belt" — pulls live from the database,   
  makes the community feel alive                                                                                        
  3. Seasonal availability tags — members can mark which fibers/products are available now vs. seasonal, useful for   
  buyers                                                                                                                
  4. Member spotlight / featured listing — a rotating "meet a maker" card on the home page to surface interesting     
  profiles                                                                                                              
  5. Email digest — weekly "new members this week" + "new exchange posts" email for active members                    
  6. Map clustering — when zoomed out, group nearby pins into a count bubble so the map is readable at state scale      
  7. Fiber type search — dedicated search bar (not just the exchange) to find "who near me works with alpaca/linen/waste
   wool" across the whole directory                                                                                     
  8. QR code for each profile — members can print/share a QR that links to their map profile at farmers markets or      
  events                                                                                                                
             

Complete Tally form structure                                                                                         
                                                                                                                        
  ▎ In Tally, every question has a Field key (variable name) in its settings panel. Set these exactly as shown — the    
  webhook reads them by key.                                                                                            
                                                                                                                        
  ---                                                                                                                   
  Section 1 — About you                                                                                                 
                                                                                                                        
  ┌──────────────────────────┬───────────────┬────────────┬──────────┐                                                  
  │         Question         │   Field key   │    Type    │ Required │                                                  
  ├──────────────────────────┼───────────────┼────────────┼──────────┤                                                  
  │ Full name                │ full_name     │ Short text │ ✅       │
  ├──────────────────────────┼───────────────┼────────────┼──────────┤                                                  
  │ Business or project name │ business_name │ Short text │          │                                                
  ├──────────────────────────┼───────────────┼────────────┼──────────┤                                                  
  │ Email address            │ email         │ Email      │ ✅       │
  ├──────────────────────────┼───────────────┼────────────┼──────────┤                                                  
  │ Phone number             │ phone         │ Phone      │          │                                                
  ├──────────────────────────┼───────────────┼────────────┼──────────┤                                                
  │ Website                  │ website       │ URL        │          │
  ├──────────────────────────┼───────────────┼────────────┼──────────┤
  │ Instagram handle         │ instagram     │ Short text │          │
  └──────────────────────────┴───────────────┴────────────┴──────────┘                                                  
   
  ---                                                                                                                   
  Section 2 — Your work                                                                                               
                                                                                                                      
  ┌───────────────────────────────────┬─────────────────────┬───────────────────┬──────────┐
  │             Question              │      Field key      │       Type        │ Required │
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤
  │ Producer type                     │ producer_type       │ Dropdown          │          │
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤
  │ Short bio (max 150 chars)         │ short_bio           │ Long text         │          │                            
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤
  │ Animal fibers you work with       │ animal_fibers       │ Multiple choice   │          │                            
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Fiber crops you grow              │ fiber_crops         │ Multiple choice   │          │                          
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Processing services you offer     │ processing_services │ Multiple choice   │          │                          
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Dye methods                       │ dye_methods         │ Multiple choice   │          │                          
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Recycling services                │ recycling_services  │ Multiple choice   │          │
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Reuse/resale                      │ reuse_services      │ Multiple choice   │          │
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Do you have waste wool available? │ waste_wool_avail    │ Checkbox (single) │          │                          
  ├───────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                            
  │ Other animal fiber (describe)     │ fiber_animal_other  │ Short text        │          │
  └───────────────────────────────────┴─────────────────────┴───────────────────┴──────────┘                            
                                                                                                                      
  Producer type dropdown options — use these exact values:                                                              
  Farmer / fiber grower                                                                                               
  Fiber processing & mills                                                                                              
  Designer / maker                                                                                                      
  Recycling & waste diversion                                                                                         
  Mending / upcycling / vintage                                                                                         
  Community resource                                                                                                    
                                                                                                                      
  animal_fibers checkbox option values:                                                                                 
  alpaca · sheep_wool · angora · mohair · cashmere · llama                                                            
                                                                                                                        
  fiber_crops option values:                                                                                            
  cotton · flax_linen · hemp · nettle                                                                                 
                                                                                                                        
  processing_services option values:                                                                                    
  dyeing · printing · spinning · weaving · felting · carding · shearing · tailoring · mending · cut_sew               
                                                                                                                        
  dye_methods option values:                                                                                          
  garden · indigo · woad · algae_ink · synthetic                                                                      

  recycling_services option values:                                                                                     
  fiber · fabric · metal · accepts_waste · shredding
                                                                                                                        
  reuse_services option values:                                                                                       
  upcycling · vintage                                                                                                 

  ---                                                                                                                   
  Section 3 — Location
                                                                                                                        
  ┌─────────────────────────┬────────────────────────┬────────────┬──────────────────┐                                
  │        Question         │       Field key        │    Type    │     Required     │                                
  ├─────────────────────────┼────────────────────────┼────────────┼──────────────────┤
  │ City                    │ city                   │ Short text │ ✅               │
  ├─────────────────────────┼────────────────────────┼────────────┼──────────────────┤
  │ State (2-letter)        │ state                  │ Short text │ (defaults to OH) │
  ├─────────────────────────┼────────────────────────┼────────────┼──────────────────┤                                  
  │ ZIP code                │ zip                    │ Short text │ ✅               │
  ├─────────────────────────┼────────────────────────┼────────────┼──────────────────┤                                  
  │ Location privacy on map │ location_privacy_level │ Dropdown   │                  │                                
  └─────────────────────────┴────────────────────────┴────────────┴──────────────────┘                                  
   
  location_privacy_level option values (must be exactly these):                                                         
  city_only                                                                                                           
  exact                                                                                                                 
                                                                                                                        
  ---
  Section 4 — Community & availability                                                                                  
                                                                                                                      
  ┌─────────────────────────────────────┬─────────────────────┬───────────────────┬──────────┐
  │              Question               │      Field key      │       Type        │ Required │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Community offerings                 │ community_offerings │ Multiple choice   │          │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ What are you looking for?           │ looking_for         │ Long text         │          │                        
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤
  │ What do you have available?         │ have_available      │ Long text         │          │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Quantity available                  │ qty_available       │ Short text        │          │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Price range                         │ price_range         │ Short text        │          │                        
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤
  │ University or research affiliation? │ is_university       │ Checkbox (single) │          │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Research areas                      │ research_areas      │ Short text        │          │
  ├─────────────────────────────────────┼─────────────────────┼───────────────────┼──────────┤                          
  │ Open to collaboration?              │ open_to_collab      │ Checkbox (single) │          │                        
  └─────────────────────────────────────┴─────────────────────┴───────────────────┴──────────┘                          
   
  community_offerings option values:                                                                                    
  workshops · csa · tours · hiring · volunteer · student_ambassador                                                   

  ---                                                                                                                   
  Section 5 — Consent (final page)
                                                                                                                        
  ┌──────────────────────────────────────────────────────────┬────────────────┬──────────────────────────┬──────────┐ 
  │                         Question                         │   Field key    │           Type           │ Required │
  ├──────────────────────────────────────────────────────────┼────────────────┼──────────────────────────┼──────────┤   
  │ "I agree for this information to appear publicly on the  │ consent        │ Checkbox (single, must   │ ✅       │
  │ Rust Belt Fibershed map."                                │                │ be checked)              │          │   
  ├──────────────────────────────────────────────────────────┼────────────────┼──────────────────────────┼──────────┤   
  │ Show my contact details publicly                         │ public_contact │ Checkbox (single)        │          │
  └──────────────────────────────────────────────────────────┴────────────────┴──────────────────────────┴──────────┘   
                                                                                                                        
  Hidden fields (add via Tally hidden fields feature):
                                                                                                                        
  ┌───────────────┬──────────────────┐                                                                                  
  │   Field key   │      Value       │
  ├───────────────┼──────────────────┤                                                                                  
  │ response_id   │ {{responseId}}   │                                                                                
  ├───────────────┼──────────────────┤
  │ submission_id │ {{submissionId}} │
  └───────────────┴──────────────────┘                                                                                  
   


Is the idea good?                                                                                                     
                                                                                                                        
  Yes, strongly. It directly solves the discovery gap — the meat sheep farmer 40 miles from a textile artist. The "I    
  have / I need" framing is exactly right for this community. Calling it the Fiber Exchange Board (already in the code) 
  fits the nonprofit voice perfectly.
                                                                                                                        
  ---                                                                                                                 
  What's already implemented
                            
  The core is surprisingly complete:
                                                                                                                        
  ┌────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────┐
  │                                          Feature                                           │       Status       │   
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤ 
  │ Public board at /exchange with search + filter by type                                     │ ✅ Done            │
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤
  │ Member-only post creation at /exchange/manage                                              │ ✅ Done            │   
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤
  │ Post fields: type, title, description, fiber category, material, quantity, price/trade     │ ✅ Done            │   
  │ terms, expiry                                                                              │                    │   
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤
  │ Edit, close, reopen, delete own posts                                                      │ ✅ Done            │   
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤ 
  │ photo_urls field in DB schema and API                                                      │ ✅ Schema + API    │   
  │                                                                                            │ only               │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤
  │ Auth-gated: only approved members can post                                                 │ ✅ Done            │
  ├────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┤   
  │ PATCH/DELETE API routes with ownership enforcement                                         │ ✅ Done            │
  └────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────┘   
                                                                                                                      
  ---                                                                                                                   
  What's missing or broken right now                                                                                  

  1. Photo upload has no UI

  photo_urls is wired into the DB and the POST/PATCH API (photoUrls: z.array(z.string().url()).max(5)) but the manage   
  form has zero photo upload UI. The field is completely invisible to members.
                                                                                                                        
  2. No "Contact" button on exchange posts                                                                            

  The public board shows "View profile" — but that sends visitors to the full profile page. There's no "Contact about   
  this post" shortcut that pre-fills context like "re: your 300 lbs fleece post." The contact relay system exists in the
   schema but isn't wired to exchange posts.                                                                            
                                                                                                                      
  3. Price/trade terms not shown publicly

  The price_or_trade_terms field is stored and editable but the public board (exchange/page.tsx) doesn't render it — it 
  only shows material type and quantity.
                                                                                                                        
  4. No 90-day auto-expiry job                                                                                          
   
  The schema has renewal_reminded_date and expires_at but there's no background job (Supabase cron or edge function) to 
  flip posts to expired or send renewal reminder emails.                                                              
                                                                                                                        
  5. Fiber category is free-text                                                                                      

  The manage form has a plain <input> for fiber category. With your taxonomy already defined (alpaca, sheep_wool,       
  angora, mohair, etc.), this should be a dropdown/multi-select — otherwise posts will be inconsistent and unsearchable.
                                                                                                                        
  6. Exchange posts are invisible on the map                                                                          

  A "300 lbs raw fleece, Medina County" post is not shown anywhere on the map. Visitors on the map page have no idea    
  exchange posts exist.
                                                                                                                        
  7. No individual post page                                                                                            
   
  There's no /exchange/[id] detail page. Everything is a list — no shareable link per post, no full photo gallery view. 
                                                                                                                      
  ---                                                                                                                   
  Improvement ideas (prioritized)                                                                                     
                                                                                                                        
  High impact, lower effort                                                                                           

  A. Photo upload in the post form                                                                                      
  Use Supabase Storage with a exchange-photos bucket. Add a file <input> that uploads to storage and stores the returned
   public URL in photo_urls. Cap at 3 photos, show thumbnails. This single feature makes posts feel real — a photo of   
  300 lbs of raw fleece is worth 1000 words.                                                                          
                                                                                                                        
  B. "Contact about this post" button                                                                                   
  On each public exchange card, add a "Send message" button that opens a modal pre-populated with the post title. Route
  it through your existing contact relay (contact_relay_emails) so the member's email is never exposed. Log             
  exchange_post_id in the relay record so Sarah can later see "this post generated 4 connections."                    
                                                                                                                        
  C. Fix: show price/trade terms on public board                                                                        
  One-line fix in exchange/page.tsx — the field is already fetched, just not rendered.
                                                                                                                        
  D. Fiber category dropdown                                                                                            
  Replace the free-text fiberCategory input with a <select> using your canonical taxonomy values. Add an "Other         
  (describe)" option for edge cases.                                                                                    
                                                                                                                      
  Medium impact                                                                                                         
                                                                                                                      
  E. Exchange post pins on the map
  Show exchange posts as a distinct layer on the map (different icon — maybe a swap/arrows icon). Toggle them on/off
  with a filter pill. Clicking a map pin for a member who has active exchange posts could show a badge like "Has active 
  listings."
                                                                                                                        
  F. Renewal reminder emails                                                                                          
  Set up a Supabase Edge Function on a daily schedule: find posts where expires_at is within 7 days AND
  renewal_reminded_date IS NULL, send a Resend email, log renewal_reminded_date. Members click "Renew for 90 days" from 
  email.
                                                                                                                        
  G. Individual post page /exchange/[id]                                                                                
  Full detail view: photo gallery (if photos exist), full description, fiber details, quantity, trade terms, member
  info, contact button. Makes each post shareable (members can share a link at farmers markets).                        
                                                                                                                      
  Differentiating ideas that would make this stand out                                                                  
                                                                                                                      
  H. "Nearby first" sorting                                                                                             
  If a visitor grants location (or has a zip on their profile), sort exchange posts by distance. "4 posts within 50
  miles of you" is far more actionable than a flat list.                                                                
                                                                                                                      
  I. Seasonal availability badge                                                                                        
  Members can tag a post as "available now" vs. "available [month]" — useful for shearing season fleece. Post cards show
   a green dot for currently available.                                                                                 
                                                                                                                      
  J. "Post from your profile" shortcut                                                                                  
  On an approved member's profile page, show a prominent "Post to Exchange Board" button if they have no active exchange
   posts. Reduces friction — the farmer approves their listing and immediately sees the prompt.                         
   
  K. Exchange activity on the home page                                                                                 
  A "Recent in the Exchange" strip on the homepage (3-4 most recent posts) with the "I have / I need" badges. Makes the
  community feel alive to new visitors and incentivizes members to keep posts fresh.                                    
   
  L. Admin moderation queue for exchange posts                                                                          
  Right now posts go live instantly on creation. For a nonprofit, you may want a simple "pending review" step before a
  post is public — especially for first-time posters. Or at minimum a "report this post" flag so admins can act on spam.
                                                                                                                      
  ---                                                                                                                   
  Summary                                                                                                             
                                                                                                                        
  The foundation is solid — schema, auth, create/edit/delete are all working. The three things that would complete the
  feature and make it genuinely useful are: photo upload UI (schema exists, UI missing), "Contact about this post"      
  button (relay system exists, wiring missing), and fiber category as a dropdown (data model exists, UI uses free text).
   Those three changes take the Exchange Board from "technically complete" to "actually usable."  