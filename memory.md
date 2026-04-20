# DesignLead — Memory & Lessons

Read at session start alongside CLAUDE.md. Add entries when new lessons have lasting value. Never delete entries.

---

## External Service Quirks

**Replicate / ControlNet depth (`jagilley/controlnet-depth`)**
Pinned version: `865a52cfc447e048994ea6d4038ba65d6d74c574162b6f54ba4b3cd25c0e0e4b`. Pass `num_samples` as string `'1'`, not integer. Output array may have multiple items even with `num_samples: '1'` — always extract `[0]`. Three renders generated in parallel via `Promise.all`. Cost ~$0.02/set. Rendering is currently disabled via `NEXT_PUBLIC_RENDERS_ENABLED=false` — all render code is intact.

**Replicate / FLUX Schnell (retired)**
`replicate.run()` output can be string, array of strings, array of objects with `.url()` method, or `.url` property. The `generateOne()` function handles all cases explicitly — do not simplify without testing. Retired in favour of ControlNet depth.

**fal.ai (abandoned)**
Do not revisit. Subscribe API returned `.data`-wrapped responses, errors swallowed silently. Multiple failed commits (`6ebd8e4`, `6330d60`, `b437e87`). Replaced by Replicate (`a5cd7d3`).

**Portfolio scraping**
`/api/scrape-portfolio` uses cheerio on static HTML. SPAs (Webflow, React-based) return 0 images — `portfolio_scrape_status` is set to `'failed'`, `ai_style_profile` stays null, renders fall back to `style_keywords`. Checks `data-src` and `data-lazy-src`. Width/height filter applies to HTML attributes only.

**Resend**
Sender is always `onboarding@resend.dev` (free tier — no custom domain). Display name is set dynamically. Client confirmation email failure is non-fatal: route still returns 200 if designer notification succeeded.

**Supabase Storage**
Photos in `room-photos` bucket (not `project-photos` — CLAUDE.md previously had wrong name). `photo_urls` column stores **storage paths**, not signed URLs. Always use `getSignedPhotoUrl()` from `lib/supabaseUtils.ts` to generate fresh 7-day signed URLs at read time. Old submissions inserted before the security audit may have expired signed URLs stored directly — photo display will be broken for those rows, brief data is unaffected.

**Anthropic Claude Vision**
Used in `/api/submit` for room photo analysis. Runs in parallel with designer profile fetch via `Promise.all`. Non-blocking: if Vision fails, returns `''` and brief generates without room context. Pinned to `claude-sonnet-4-20250514`.

**Groq**
Primary brief scoring model (`llama-3.3-70b-versatile`). No Claude fallback if Groq fails — `/api/submit` returns 500. `lead_quality` is parsed from last line of brief via regex: `/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i`. If Groq changes output format, parse fails silently and `lead_quality` is stored as null. Now wrapped in try/catch with `logError()`.

**Vercel Cron**
`0 8 * * *` UTC. Protected by `CRON_SECRET` bearer. Only fires for designers with `notification_preference = 'digest'`. Cannot be tested locally — call `/api/cron/digest` directly with `Authorization: Bearer <CRON_SECRET>`.

---

## Code-Level Decisions

**Render generation is fire-and-forget via `waitUntil`**
Triggered from `/api/submit` using `waitUntil()` from `@vercel/functions`. Form submission returns immediately; render continues post-response. Results page polls `/api/results-data` every 4s until `render_status` changes from `pending`. Never block form submission on render generation.

**`maxDuration = 60` on the render route**
Vercel Hobby hard limit regardless of what `maxDuration` is set to (commit `14d03fc`). Do not attempt to raise it.

**`is_paid` vs `isPro()`**
`is_paid` boolean is legacy. All business logic uses `isPro(designer)` from `lib/designerUtils.ts`. Future Stripe migration will rename to `plan_tier` — the abstraction makes that a one-file change.

**Multi-tenant via URL slugs (Phase 4.6)**
`/a/[slug]` and `/dashboard/[slug]`. `DESIGNER_SLUG`, `DESIGNER_EMAIL`, `DESIGNER_NAME` env vars removed. Designer context always from URL slug or `submission.designer_slug`. DB reset: 2026-04-19.

**Slug generation**
`tools/slug.ts`. Hungarian diacritics: á→a, é→e, í→i, ó/ö/ő→o, ú/ü/ű→u. Max 40 chars, word-boundary truncation. Archived designers can share slugs with new active ones (partial unique index). Reserved slugs get `-studio` suffix or numeric counter.

**Per-designer bcrypt passwords**
Set at signup, stored in `designers.dashboard_password_hash` (cost 10). `DASHBOARD_PASSWORD` env var fully deprecated. Admin reset generates new random password via `crypto.getRandomValues`, re-hashes, shows to designer once on confirmation screen.

**`mailto:` for response emails**
AI draft surfaced in dashboard. Designer sends from their own email client. Zero new integrations. Upgradable to OAuth in a later phase.

**`response_tone` fallback**
Falls back to `'warm and personal'` when null (pre-Phase 4 designers). New designers set this in onboarding.

**Budget ranges in HUF**
Hard-coded in `IntakeForm.tsx` (`BUDGET_RANGES` array). Not configurable per designer.

**Results page brief truncation**
`extractBriefSections()` shows client only sections 1 and 2 (Project summary + Client profile). Budget fit, scope, lead quality are designer-only.

**Token-gated results page**
UUID in `results_page_token`. No login. Token in email — if email fails, client has no way to access results.

**Soft-delete via `archived_at`**
Every read query on `designers` or `submissions` must include `.is('archived_at', null)`. Missing this filter causes archived records to leak everywhere. Audited at Phase 4.5 — all 10 missing filters fixed. Any new query must include this from day one.

**`admin_actions` is the audit trail**
Every admin action is logged with `action_type`, `target_type`, `target_id`, `details` jsonb. Query this table to answer "did I do that?"

**Admin is single hardcoded password**
`ADMIN_PASSWORD` env var. `X-Admin-Auth` header on all admin API routes. Pragmatic solo-operator decision. Do not add a second admin user without upgrading to session tokens first.

**`error_logs` table**
Created in security audit. `logError(context, error, details?)` in `lib/errorLog.ts` writes to `console.error` + Supabase `error_logs`. Admin health panel shows 10 most recent. Use on all critical paths — no bare `console.error`.

---

## Security (Phase 4.8)

- Edge rate limiting: `/api/submit` (5 req/IP/60s), `/api/upload` (10/60s), `/api/onboard` (3/hour). In-memory sliding window in `middleware.ts`. Flagged for Upstash Redis upgrade post-May 2026.
- `INTERNAL_API_SECRET` protects `/api/scrape-portfolio` via `lib/internalAuth.ts` using `crypto.timingSafeEqual()`.
- Admin auth uses `crypto.timingSafeEqual()` in `lib/adminAuth.ts`.
- HTML escaping: all user input goes through `htmlEscape()` from `lib/utils.ts` before email HTML interpolation.
- Security headers in `next.config.mjs`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`. Embed route excluded from X-Frame-Options.
- Admin `GET /api/admin/designers/[slug]` no longer returns `dashboard_password_hash`.
- `WEBHOOK_SECRET` env var added for render webhook (separate from `CRON_SECRET`).

---

## Known Edge Cases

**Replicate output shape**
Handled by multi-branch extraction in `generateOne()`. If output resolves to `'[object Object]'`, error is thrown and render status set to `failed`.

**Empty photos array**
Validated client-side (form won't submit) and server-side (returns 400). If bypassed via direct POST with `photoUrls: []`, server returns 400.

**Designer profile not found**
Brief generates without designer context. Render falls back to `'contemporary, refined'` style keywords.

**Missing `results_page_token`**
Would produce broken URL in results email. Should never happen given current insert logic — but no server-side guard exists for direct DB manipulation.

**No RLS on Supabase**
All DB access via service role key (bypasses RLS). Acceptable while all access is server-side. Would need RLS policies if any client-side Supabase calls are introduced.

**`NEXT_PUBLIC_SUPABASE_URL` vs `SUPABASE_URL`**
Server-side routes may still reference `SUPABASE_URL` (without `NEXT_PUBLIC_`). Verify which is set in Vercel if routes silently fail config checks.

---

## Things That Didn't Work

**fal.ai** — see External Service Quirks above.

**`maxDuration` above 60** — Vercel Hobby silently caps at 60 regardless. Commit `14d03fc`. Do not attempt.

---

## Design System Lock-In (Phase 4.10)

New token set ("Noir Editorial × Warm Slate") — see CLAUDE.md for full values. Key changes from previous "Obsidian & Champagne":
- Accent: `#B8935A` (was `#C9A96E`)
- Card border-radius: **6px** (exception to the 2px rule for card containers only)
- Tokens defined as local CSS custom properties per component (global migration to `globals.css` deferred)
- All @keyframes in `app/globals.css`
- Left-border quality signal: High = `2px solid #B8935A`, Medium = `2px solid rgba(184,147,90,0.3)`, Low = no border
