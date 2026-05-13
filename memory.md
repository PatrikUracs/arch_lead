# DesignLead — Memory & Lessons

Read at session start alongside CLAUDE.md. Add entries when new lessons have lasting value. Never delete entries.

---

## External Service Quirks

**Replicate / ControlNet depth (`jagilley/controlnet-depth`)**
Pinned version: `865a52cfc447e048994ea6d4038ba65d6d74c574162b6f54ba4b3cd25c0e0e4b`. Pass `num_samples` as string `'1'`, not integer. Output array may have multiple items — always extract `[0]`. Three renders in parallel via `Promise.all`. Cost ~$0.02/set. Currently disabled via `NEXT_PUBLIC_RENDERS_ENABLED=false` — all render code intact.

**Portfolio scraping**
`/api/scrape-portfolio` uses cheerio on static HTML. SPAs (Webflow, React-based) return 0 images — `portfolio_scrape_status` set to `'failed'`, `ai_style_profile` stays null, renders fall back to `style_keywords`. Checks `data-src` and `data-lazy-src`. Width/height filter applies to HTML attributes only.

**Resend**
Sender is always `onboarding@resend.dev` (free tier). Display name set dynamically. Client confirmation email failure is non-fatal — route still returns 200 if designer notification succeeded.

**Supabase Storage**
Bucket is `room-photos` (not `project-photos`). `photo_urls` stores storage paths, not signed URLs. Always use `getSignedPhotoUrl()` from `lib/supabaseUtils.ts` for fresh 7-day signed URLs. Old submissions before the security audit may have broken photo display — brief data is unaffected.

**Anthropic Claude Vision**
Used in `/api/submit` for room photo analysis. Runs in parallel with designer profile fetch via `Promise.all`. Non-blocking: if Vision fails, returns `''` and brief generates without room context. Pinned to `claude-sonnet-4-20250514`.

**Groq**
Primary brief scoring model (`llama-3.3-70b-versatile`). No Claude fallback if Groq fails — `/api/submit` returns 500. `lead_quality` parsed from last line of brief via regex: `/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i`. If Groq changes output format, parse fails silently and `lead_quality` is null. Wrapped in try/catch with `logError()`.

**Vercel Cron**
`0 8 * * *` UTC. Protected by `CRON_SECRET` bearer. Only fires for designers with `notification_preference = 'digest'`. Cannot be tested locally — call `/api/cron/digest` directly with `Authorization: Bearer <CRON_SECRET>`.

**Vercel function limit**
Hobby hard cap is 60s regardless of `maxDuration`. Do not attempt to raise it.

---

## Code-Level Decisions

**Render generation is fire-and-forget via `waitUntil`**
Triggered from `/api/submit` using `waitUntil()` from `@vercel/functions`. Submission returns immediately; render continues post-response. Results page polls `/api/results-data` every 4s until `render_status` changes from `pending`.

**`isPro()` over `is_paid`**
`is_paid` is legacy. All business logic uses `isPro(designer)` from `lib/designerUtils.ts`. Future Stripe migration will rename to `plan_tier` — one-file change.

**Multi-tenant via URL slugs**
`/a/[slug]` and `/dashboard/[slug]`. `DESIGNER_SLUG`, `DESIGNER_EMAIL`, `DESIGNER_NAME` env vars removed. Designer context always from URL slug or `submission.designer_slug`.

**Slug generation**
`tools/slug.ts`. Hungarian diacritics: á→a, é→e, í→i, ó/ö/ő→o, ú/ü/ű→u. Max 40 chars, word-boundary truncation. Archived designers can share slugs with new active ones (partial unique index). Reserved slugs get `-studio` suffix or numeric counter.

**Per-designer bcrypt passwords**
Set at signup, stored in `designers.dashboard_password_hash` (cost 10). `DASHBOARD_PASSWORD` env var fully deprecated. Admin reset generates new random password, re-hashes, shown once on confirmation screen.

**`mailto:` for response emails**
AI draft surfaced in dashboard. Designer sends from their own email client. Upgradable to OAuth later.

**`response_tone` fallback**
Falls back to `'warm and personal'` when null (pre-Phase 4 designers).

**Budget ranges in HUF**
Hard-coded in `IntakeForm.tsx` (`BUDGET_RANGES` array). Not configurable per designer.

**Results page brief truncation**
`extractBriefSections()` shows client only sections 1–2 (Project summary + Client profile). Budget fit, scope, lead quality are designer-only.

**Token-gated results page**
UUID in `results_page_token`. No login. Token in email — if email fails, client cannot access results.

**Soft-delete via `archived_at`**
Every read query on `designers` or `submissions` must include `.is('archived_at', null)`. Audited at Phase 4.5 — all missing filters fixed. Any new query must include this from day one.

**`admin_actions` audit trail**
Every admin action logged with `action_type`, `target_type`, `target_id`, `details` jsonb.

**Admin auth**
Single `ADMIN_PASSWORD` env var. `X-Admin-Auth` header on all admin routes. Do not add a second admin user without upgrading to session tokens first.

**`error_logs` table**
`logError(context, error, details?)` in `lib/errorLog.ts` writes to `console.error` + Supabase `error_logs`. Admin health panel shows 10 most recent. Use on all critical paths.

---

## Security

- Edge rate limiting: `/api/submit` (5 req/IP/60s), `/api/upload` (10/60s), `/api/onboard` (3/hour). In-memory sliding window in `middleware.ts`. Flagged for Upstash Redis upgrade post-May 2026.
- `INTERNAL_API_SECRET` protects `/api/scrape-portfolio` via `lib/internalAuth.ts` using `crypto.timingSafeEqual()`.
- Admin auth uses `crypto.timingSafeEqual()` in `lib/adminAuth.ts`. Failed admin login incurs a 1.5s forced delay to throttle brute-force (added 2026-05-13).
- All user input goes through `htmlEscape()` from `lib/utils.ts` before email HTML interpolation.
- Security headers in `next.config.mjs`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`. Embed route excluded from X-Frame-Options.
- Admin `GET /api/admin/designers/[slug]` does not return `dashboard_password_hash`.
- `WEBHOOK_SECRET` is separate from `CRON_SECRET`.

### API Route Auth Checklist — apply to every new route

Every API route that reads or writes `submissions` or `designers` must satisfy ALL of the following before shipping:

1. **Designer-owned routes** (dashboard, status update, settings): require `slug` + `password` in body or `x-dashboard-password` header. Verify via `bcrypt.compare` against `dashboard_password_hash`. Never trust slug alone.
2. **Scope all writes to the authenticated slug**: `.eq('designer_slug', slug)` on every UPDATE/DELETE in addition to the ID filter — so a valid session cannot touch another designer's rows.
3. **Admin routes**: must call `verifyAdminAuth(req)` from `lib/adminAuth.ts` as the first statement. No exceptions.
4. **Public token routes** (results page, webhooks): validate token format before the DB query (UUID regex or HMAC check). Do not echo the token back in the response.
5. **No unauthenticated mutations**: a PATCH/PUT/DELETE with only an entity ID and no auth check is always wrong. IDs are not secrets.
6. **GET routes are not implicitly safe**: `GET /api/dashboard-data` had no auth and returned all submissions + client emails. Treat GET routes that return private data the same as mutations.

### Why these rules exist (2026-05-13 audit findings)
- `PATCH /api/submissions/[id]/status` shipped with zero auth — any submission ID in the URL was enough to change its status.
- `GET /api/dashboard-data` shipped with zero auth — all submissions and client data for any designer were publicly readable by slug.
- Service role key bypasses all Supabase RLS, so application-layer auth is the only guard. There is no database safety net.

---

## Known Edge Cases

**Empty photos array**
Validated client-side and server-side (returns 400). Direct POST with `photoUrls: []` also returns 400.

**Designer profile not found**
Brief generates without designer context. Render falls back to `'contemporary, refined'` style keywords.

**Missing `results_page_token`**
Would produce broken URL in results email. No server-side guard exists for direct DB manipulation.

**No RLS on Supabase**
All DB access via service role key. Acceptable while all access is server-side. Would need RLS if client-side Supabase calls are introduced.

---

## Fixed Layer / Motion System Lessons

**Fixed-position visual layers (ambient, grain, cursor glow) must never use scoped/inline CSS.**
All `.ambient`, `.grain`, `.cursor-glow` rules must live in `app/globals.css`. If these classes are defined inside a component `<style>` tag or inline styles, they may not apply or may be inconsistent across pages. Always verify in DevTools → Elements → Computed styles that `position: fixed` is showing on `.ambient`.

**CursorGlow must render `null` and wire via `getElementById`, not render its own div.**
Pattern: bare `<div className="cursor-glow" id="cursor-glow" />` in `layout.tsx` (server), plus a `'use client'` CursorGlow component that renders `null` and wires the RAF loop via `document.getElementById('cursor-glow')`. Glow starts hidden (`opacity: 0`) and adds `.is-on` on first mousemove. Previous pattern (rendering the div from the client component) caused the glow to be visible at (0,0) before any mouse movement.

**`background: var(--dl-bg-page)` must only appear on `<body>` — never on section or wrapper divs.**
Any solid opaque background on a full-width/full-height div completely occludes `position: fixed` layers beneath it. In `page.tsx`, the `.lb` wrapper class, the hero `<section>`, and the scroll sections all had `background: var(--dl-bg-page)` — this buried the ambient/grain/glow under solid `#0F0D0A`. Fix: remove all `background` from section/wrapper divs; let the `<body>` radial gradient be the only page background. Do a global search for `dl-bg-page` in any page file before shipping and remove any instance that is a `background` (not `color`) property on a structural wrapper.

---

## Design System Lock-In

Token set "Noir Editorial × Warm Slate" — see CLAUDE.md for full values.
- Accent: `#B8935A`
- Card border-radius: **6px** (exception to the 2px rule for card containers only)
- Tokens defined as local CSS custom properties per component
- All `@keyframes` in `app/globals.css`
- Left-border quality signal: High = `2px solid #B8935A`, Medium = `2px solid rgba(184,147,90,0.3)`, Low = no border
