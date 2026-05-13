# DesignLead — PLAYBOOK

Single source of truth for agent sessions. Replaces all prior project summaries.
Load this file at session start. Do not load Summary_2026_04_20 or Summary_of_04.26.

---

## 1. What It Is

Multi-tenant SaaS for interior designers. Homeowners fill a 3-step intake form and upload room photos; the server runs an AI pipeline that generates a structured lead brief and a draft response email. Designers manage leads from a private dashboard. No free tier. Paid product only.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript | |
| Styling | Tailwind CSS + inline CSS custom properties | Design tokens per component |
| Database + Storage | Supabase (Postgres + `room-photos` bucket), free tier | Service role key, server-side only |
| Brief generation | Groq `llama-3.3-70b-versatile` | Fast, cheap |
| Email draft + portfolio scraping | Anthropic `claude-sonnet-4-20250514` | |
| Room photo analysis | Anthropic `claude-sonnet-4-6` (Vision) | Runs in parallel in `/api/submit` |
| Render previews | Replicate ControlNet depth (`jagilley/controlnet-depth`) | Disabled via `NEXT_PUBLIC_RENDERS_ENABLED=false` |
| Email delivery | Resend, free tier | Sender always `onboarding@resend.dev` |
| Hosting | Vercel Hobby | 60s hard function limit, cannot be raised |
| Deploy | `npx vercel --prod` | Git push does NOT auto-deploy |

---

## 3. URL Structure

| Path | Purpose |
|---|---|
| `/` | ⚠️ VERIFY: redirect to `/onboard` or marketing landing page? |
| `/onboard` | Designer signup (open, no access key) |
| `/a/[slug]` | Client-facing intake form |
| `/a/[slug]/embed` | Chromeless iframe version for embedding |
| `/dashboard/[slug]` | Password-protected designer dashboard |
| `/results/[token]` | Token-gated client results page |
| `/admin` | Operator panel (single `ADMIN_PASSWORD`) |

---

## 4. Database Schema

### `designers`

| Column | Type | Notes |
|---|---|---|
| `slug` | text, unique | See slug rules below |
| `name` | text | |
| `email` | text | Required for notifications |
| `studio_name` | text | |
| `bio` | text | |
| `style_keywords` | text[] | Fallback when `ai_style_profile` is null |
| `typical_project_size` | text | |
| `rate_per_sqm` | text | Legacy free-text field |
| `response_tone` | text | `'warm'` / `'professional'` / `'enthusiastic'`; null → fallback `'warm and personal'` |
| `ai_style_profile` | text | Populated by portfolio scraper |
| `portfolio_scrape_status` | text | `'pending'` / `'complete'` / `'failed'` |
| `calendly_url` | text | |
| `is_paid` | boolean | Pro flag — never read directly; use `isPro()` |
| `notification_preference` | text | `'instant'` / `'digest'` |
| `dashboard_password_hash` | text | bcrypt cost 10; set at signup |
| `pricing_hourly`, `pricing_flat`, `pricing_minimum`, `pricing_m2` | boolean | |
| `pricing_hourly_rate`, `pricing_flat_rate`, `pricing_minimum_amount`, `pricing_m2_rate` | number (HUF) | |
| `market_positioning` | text | `'budget'` / `'mid'` / `'premium'` / `'luxury'` |
| `email_verified` | boolean | Default false — set to true via `/api/verify-email?token=...` |
| `email_verification_token` | text | Single-use 64-char hex token; cleared after verification |
| `archived_at` | timestamp | Soft-delete — every query must filter `.is('archived_at', null)` |

#### Slug generation rules
Source of truth: `memory.md` → "Slug generation" entry. Summary:
- Generated from `studio_name` via `tools/slug.ts`.
- Hungarian diacritics transliterated: á→a, é→e, í→i, ó/ö/ő→o, ú/ü/ű→u.
- Max 40 chars, truncated at word boundary.
- Reserved slugs (e.g. `admin`, `api`, `onboard`) get a `-studio` suffix; if that's also taken, append a numeric counter.
- Archived designers do not block slug reuse — the unique index is partial (active only).

### `submissions`

| Column | Type | Notes |
|---|---|---|
| `designer_slug` | text | FK to `designers.slug` |
| `client_name`, `client_email` | text | |
| `room_type` | text | |
| `room_size` | number | m² |
| `project_type` | text | |
| `room_count` | number | Optional |
| `design_style` | text | |
| `budget_range` | text | Legacy field |
| `design_budget_huf` | text | Design fee budget specifically |
| `fitout_planned` | boolean | null = unknown |
| `fitout_budget_huf` | text | |
| `timeline` | text | |
| `additional_info` | text | |
| `photo_urls` | text[] | Storage paths — never raw; use `getSignedPhotoUrl()` |
| `brief` | text | Groq-generated lead brief; fee direction is prose inside here |
| `lead_quality` | text | `'High'` / `'Medium'` / `'Low'` — parsed from brief via regex |
| `offer_direction` | jsonb | Always null — fee direction moved to brief prose; dead column |
| `ai_response_draft` | text | Claude-generated email body |
| `ai_response_subject` | text | |
| `render_status` | text | `'pending'` / `'not_applicable'` / `'complete'` / `'failed'` |
| `results_page_token` | uuid | Token-gated results link; lives in client email |
| `status` | text | `'New'` / `'Contacted'` / etc. |
| `archived_at` | timestamp | Soft-delete — every query must filter `.is('archived_at', null)` |

### `admin_actions`
Audit log. Columns: `action_type`, `target_type`, `target_id`, `details` (jsonb), timestamp.

### `admin_preview_tokens`
1-hour tokens for admin dashboard preview. No details needed here.

### `error_logs`
Written by `logError()` in `lib/errorLog.ts`. Columns: `context`, `message`, `details` (jsonb), timestamp.

---

## 5. Core Data Flow — `/api/submit` Pipeline

1. Client pre-uploads photos via `/api/upload` → Supabase Storage → returns storage paths.
2. Client submits form with photo paths array. Server validates: empty array → 400.
3. Insert submission record to DB **before** sending any emails (prevents orphaned records).
4. Parallel: Claude Vision (`claude-sonnet-4-6`) analyzes room photos + fetch designer profile from DB.
5. Build Groq prompt: inject designer profile, client answers, room analysis, and pre-computed fee direction (m² × 18 × 410 = lower bound, m² × 25 × 410 = upper bound HUF, rounded to nearest 10,000; timeline 1–3 months → ×1.18 urgency premium). Numbers are pre-computed in the template string — Groq only fills values.
6. Groq `llama-3.3-70b-versatile` generates structured brief. Parse `lead_quality` from last line via `/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i`. Parse failure → `lead_quality` is null (silent).
7. Claude `claude-sonnet-4-20250514` generates draft email subject + body, respecting designer's `response_tone`. Null `response_tone` falls back to `'warm and personal'`.
8. Resend dispatches two emails: designer notification (includes AI draft) + client confirmation (includes `/results/[token]` link). Client email failure is non-fatal — route returns 200 if designer email succeeded.
9. Return 200 to client immediately.
10. If `NEXT_PUBLIC_RENDERS_ENABLED=true`: render generation continues fire-and-forget via `waitUntil()` from `@vercel/functions`. Results page polls `/api/results-data` every 4s until `render_status` changes from `pending`.

---

## 6. Architectural Rules (Non-Negotiable)

- Every query on `designers` or `submissions` must filter `.is('archived_at', null)`.
- Photos are mandatory (min 1). Enforce client-side and server-side; return 400 on empty array.
- Use `getSignedPhotoUrl()` from `lib/supabaseUtils.ts` — never use raw storage paths directly.
- Use `isPro(designer)` from `lib/designerUtils.ts` — never read `is_paid` directly.
- Use `logError()` from `lib/errorLog.ts` on all critical paths — no bare `console.error`.
- Never hardcode designer identity. Always resolve from URL slug → DB lookup.
- Background work (renders) must use `waitUntil()` from `@vercel/functions`. Never block the response.
- Designer response emails are `mailto:` links only. Never send directly from the app.
- All render code paths are behind the `NEXT_PUBLIC_RENDERS_ENABLED` feature flag (`lib/flags.ts`).
- No RLS on Supabase. All DB access is via service role key, server-side only.
- Insert DB record before sending emails. No email before the row exists.
- Admin routes require `X-Admin-Auth` header; checked via `lib/adminAuth.ts` with `crypto.timingSafeEqual()`.
- Internal server-to-server routes require `INTERNAL_API_SECRET` via `lib/internalAuth.ts`.
- All `@keyframes` declarations go in `app/globals.css`. Not in component files or `<style>` tags.

---

## 7. Design System — "Noir Editorial × Warm Slate"

Design system is dual-mode. Dark (default): token set as documented below. Light mode: `[data-theme="light"]` blocks in `app/globals.css`. `ThemeToggle.tsx` handles switching.

### Color Tokens

| Token | Value |
|---|---|
| `--dl-bg-page` | `#0F0D0A` |
| `--dl-bg-card` | `#181510` |
| `--dl-bg-elevated` | `#1A1710` |
| `--dl-accent` | `#B8935A` |
| `--dl-accent-dim` | `rgba(184, 147, 90, 0.3)` |
| `--dl-accent-subtle` | `rgba(184, 147, 90, 0.12)` |
| `--dl-text-primary` | `#EDE5D0` |
| `--dl-text-muted` | `rgba(237, 229, 208, 0.35)` |
| `--dl-border-default` | `rgba(255, 255, 255, 0.05)` |
| `--dl-border-accent` | `rgba(184, 147, 90, 0.2)` |
| `--dl-rule-gradient` | `linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%)` |

Tokens are defined as local CSS custom properties per component, not globally.

### Typography

| Size | Weight | Case | Tracking | Use |
|---|---|---|---|---|
| 11px | 300 | uppercase | 0.14em | Metadata labels, badges |
| 13px | 300 | — | — | Secondary body, muted descriptions |
| 15px | 400 | — | — | Primary body text |
| 18px | 300 | — | — | Lead card titles, form step labels |
| 24px | 400 Playfair | — | — | Stat numbers, studio names |
| 32px | 400 Playfair | — | — | Page headings |

- **Playfair Display** — studio/designer names and stat numbers only.
- **Montserrat** — everything else (200 body, 300 labels, 400 buttons).

### Radius
- 2px everywhere.
- 6px for card containers only.
- Badges and inputs stay 2px.

### Hover
- border-color + background transitions only, 0.2s ease.
- No `transform`, no `scale`, no shadows.

### Lead Quality Left-Border
- High: `2px solid #B8935A`
- Medium: `2px solid rgba(184,147,90,0.3)`
- Low: no border

### Component States
- Loading: animated ellipsis only — no spinners, no skeletons.
- Empty: single `--dl-text-muted` label centered — no illustrations, no CTAs.
- Error: `--dl-text-muted` inline below field — no alert boxes, no icons.

### Fixed-Position Layer Rules
- `.ambient`, `.grain`, `.cursor-glow` rules must live in `app/globals.css` — not in component `<style>` tags.
- `background: var(--dl-bg-page)` must only appear on `<body>`. Never on section or wrapper divs — it occludes fixed layers beneath.
- CursorGlow component renders `null` and wires via `document.getElementById('cursor-glow')`. The bare `<div class="cursor-glow" id="cursor-glow" />` lives in `layout.tsx` (server component).

---

## 8. Environment Variables

```
ANTHROPIC_API_KEY
GROQ_API_KEY
REPLICATE_API_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
CRON_SECRET
INTERNAL_API_SECRET
WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_RENDERS_ENABLED=false
```

`WEBHOOK_SECRET` and `CRON_SECRET` are separate secrets.

---

## 9. API Route Security Rules

Every new API route that reads or writes `submissions` or `designers` must pass this checklist before shipping. These rules exist because a 2026-05-13 audit found a fully unauthenticated PATCH endpoint and a fully unauthenticated GET endpoint exposing all client data. A full hardening pass was completed on 2026-05-13.

**No RLS safety net.** All DB access uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Supabase RLS entirely. Application-layer auth is the only guard.

| Rule | Pattern |
|---|---|
| Designer-owned mutation | Require `slug` + `password` in body; bcrypt-verify against `dashboard_password_hash` before touching DB |
| Designer-owned read | Require `x-dashboard-password` header; bcrypt-verify same as above |
| Scope writes to slug | Add `.eq('designer_slug', slug)` to every UPDATE/DELETE alongside the ID filter |
| Admin routes | Call `verifyAdminAuth(req)` as first statement — no exceptions |
| Token-gated routes | Validate token format (UUID regex) before hitting DB; never echo token back in response |
| GET ≠ safe | Treat GET routes returning private data the same as mutations — they need auth too |
| ID ≠ auth | An entity ID in the URL is not a secret and is not authentication |
| Brute-force delay | Add `await new Promise((r) => setTimeout(r, 1500))` before returning 401 on wrong password |
| Webhook secrets | Put in URL path segment (`/api/render-webhook/[secret]`), never in query params; verify with `crypto.timingSafeEqual()` |
| SSRF | Any route fetching a user-supplied URL must call `assertSafeUrl()` (see `app/api/scrape-portfolio/route.ts`) before `fetch()` |
| File uploads | Validate magic bytes (actual file header), not just `file.type` — see `detectMagicBytes()` in `app/api/upload/route.ts` |
| Payload size | Cap total body at 64 KB (`content-length` check) + per-field max lengths on all intake routes |
| Webhook idempotency | Check DB state before processing — skip if already done, to prevent duplicate emails |
| AI output in HTML | Always `htmlEscape()` before any `.replace()` that injects HTML tags |
| Sensitive data in responses | Never return plaintext passwords/tokens in JSON — email them to the recipient instead |

---

## 10. Known Production Gotchas

- Vercel Hobby 60s function cap is hard. Cannot be raised. Renders must be fire-and-forget.
- Rate limiting is in-memory sliding window in `middleware.ts`. Resets on cold start. Limits: `/api/submit` 5 req/IP/60s, `/api/upload` 10/60s, `/api/onboard` 3/hour. Upstash Redis upgrade planned post-May 2026.
- Groq brief parse is regex on the last line. If Groq changes output format, `lead_quality` silently becomes null.
- Replicate output is an array — always take `[0]`. Pass `num_samples` as string `'1'`, not integer. Pinned version: `865a52cfc447e048994ea6d4038ba65d6d74c574162b6f54ba4b3cd25c0e0e4b`.
- Portfolio scraper uses cheerio on static HTML only. SPAs (Webflow, React-based sites) return 0 images → `portfolio_scrape_status = 'failed'`, falls back to `style_keywords`.
- `photo_urls` stores storage paths, not signed URLs. Old submissions before the security migration may have broken photo display; brief data is unaffected. Always use `getSignedPhotoUrl()` for fresh 7-day signed URLs.
- Client confirmation email failure is non-fatal. Route returns 200 if designer notification succeeded.
- `results_page_token` lives in the client email. If email fails, client cannot access results. No server-side guard against direct DB manipulation of this token.
- `response_tone` null (pre-migration designers) → fallback `'warm and personal'`.
- No RLS on Supabase. Acceptable while all access is server-side. Requires RLS before any client-side Supabase calls.
- Resend sender is locked to `onboarding@resend.dev` on the free tier. Display name is set dynamically.
- `offer_direction` DB column always null. Fee direction is prose inside `brief`. Dead code: `OfferDirection` type + `offer_direction: OfferDirection | null` in `app/dashboard/[slug]/page.tsx` lines 39–45.
- Admin auth is a single `ADMIN_PASSWORD`. Adding a second admin user requires upgrading to session tokens first.
- Digest cron (`0 8 * * *` UTC) cannot be tested locally. Call `/api/cron/digest` directly with `Authorization: Bearer <CRON_SECRET>`.

---

## 10. Current Phase

Phase 4.10 (frontend polish and motion system) is shipped. All surfaces — dashboard, intake form, onboarding form, results page — have the design system applied. The motion system (ambient background, grain overlay, cursor glow, scroll reveals, field focus animations) is live. No successor phase is currently defined. Next known work items are listed below.

---

## 11. Not Built Yet

- Fee direction formula uses hardcoded rates (m² × 18–25 × 410 HUF). Should pull from the designer's own `pricing_m2_rate` from their settings.
- Dead `OfferDirection` type cleanup in `app/dashboard/[slug]/page.tsx` lines 39–45.
- Render pipeline re-enable — all paths are tagged `// RENDERS_ENABLED`; toggle `NEXT_PUBLIC_RENDERS_ENABLED=true` to restore.
- In-memory rate limiting → Upstash Redis (post-May 2026).
- RLS — required before any client-side Supabase calls are introduced.
- Admin auth multi-user support — needs session token infrastructure first.
- Portfolio scraper support for SPAs (Webflow, React) — currently unsupported.
- `mailto:` only for designer responses — OAuth/SMTP integration not built.
- Budget ranges in `IntakeForm.tsx` are hardcoded HUF values — not configurable per designer.
- Admin panel reset-password UI: the old UI read `response.password` from the JSON. Now the API returns `{ success: true }` only — update the admin UI to show "Password sent to designer's email" instead of displaying the password.
