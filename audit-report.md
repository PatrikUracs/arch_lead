# DesignLead Architectural Audit

**Audit date:** 2026-04-19
**Audit type:** Quick pass
**Scope:** Full codebase
**Output type:** Identification only, no fixes proposed

---

## Executive summary

The codebase is well-structured for a solo-operated SaaS at this stage: the multi-tenant Phase 4.6 refactor is clean, the archived_at filter discipline is consistent, and the admin panel is a genuine improvement over what came before. The most urgent concerns cluster around two themes: (1) every externally-callable endpoint that triggers paid AI services is completely unprotected from abuse, and (2) the security primitives used for admin and password management have exploitable weaknesses. A targeted hardening sprint of 1–2 days would close the critical and high severity items before user growth makes them costly.

Total issues: **22** — 1 Critical, 8 High, 8 Medium, 5 Low.

---

## Severity breakdown

- Critical: 1
- High: 8
- Medium: 8
- Low: 5

---

## Part A — Independent audit findings

### Critical issues

#### No rate limiting on public AI-triggering endpoints

**Category:** Security / Reliability
**Severity:** Critical
**Location:** `app/api/submit/route.ts`, `app/api/upload/route.ts`, `app/api/onboard/route.ts`

All three public endpoints accept unlimited anonymous requests. A single automated script can flood `/api/submit` to trigger unlimited Claude Vision calls (~$0.01/call), Groq completions, and Replicate renders (~$0.02/render set). `/api/upload` can be used to fill Supabase Storage. `/api/onboard` can create unlimited designer accounts. There is no IP throttling, request counting, CAPTCHA, or any abuse protection of any kind.

**Fix category:** Add middleware-level rate limiting (e.g. Upstash Redis rate limiter, or Vercel's built-in edge rate limiting). Apply per-IP limits on all three routes before any AI or storage calls execute.

---

### High severity issues

#### Admin password compared with plain string equality (timing attack)

**Category:** Security
**Severity:** High
**Location:** `lib/adminAuth.ts:7`, `app/api/admin/auth/route.ts:17`

`verifyAdminAuth()` uses `header === expected` — a direct string comparison that is vulnerable to timing attacks. Additionally, the raw admin password is transmitted in every API request as the `x-admin-auth` header value, meaning it appears in plaintext in server logs, CDN logs, and any proxy between client and server. The admin auth endpoint also compares raw strings directly.

**Fix category:** Replace string equality with `crypto.timingSafeEqual()`. Consider replacing the per-request raw-password header scheme with short-lived session tokens issued at login.

---

#### CRON_SECRET exposed in Replicate webhook URLs as a query parameter

**Category:** Security
**Severity:** High
**Location:** `app/api/render/route.ts:102`

The `CRON_SECRET` is embedded directly in the Replicate webhook URL: `?secret=${secret}`. This means the secret is visible in Replicate's prediction dashboard, in any proxy/CDN access logs on its path, and in HTTP Referer headers. An attacker who obtains this URL can call the cron digest endpoint with a valid bearer token. The same secret is dual-used for both webhook auth and the Vercel Cron `Authorization: Bearer` header.

**Fix category:** Use a separate `WEBHOOK_SECRET` env var for webhook validation, distinct from `CRON_SECRET`. Pass it in a custom header rather than a query parameter, and validate it in the webhook handler.

---

#### `Math.random()` used for admin-generated designer passwords

**Category:** Security
**Severity:** High
**Location:** `app/api/admin/designers/[slug]/reset-password/route.ts:9-14`

`generatePassword()` uses `Math.floor(Math.random() * chars.length)` to construct 16-character passwords. `Math.random()` is not a cryptographically secure PRNG and its output is theoretically predictable given knowledge of the JS engine seed. Generated passwords are shown once in plaintext and become the designer's primary credential.

**Fix category:** Replace `Math.random()` with `crypto.getRandomValues()` (available in all modern Node.js environments).

---

#### `/api/scrape-portfolio`, `/api/render`, and `/api/designer-settings` have no authentication

**Category:** Security
**Severity:** High
**Location:** `app/api/scrape-portfolio/route.ts:85-93`, `app/api/render/route.ts:50-58`, `app/api/designer-settings/route.ts:8-26`

All three routes accept unauthenticated POST/PATCH requests from anyone who knows a valid designer slug or submission ID. `/api/scrape-portfolio` triggers a Claude Vision call per-invocation — an attacker can spam it with a known slug to exhaust the Anthropic API budget. `/api/render` triggers Replicate predictions (~$0.02 each). `/api/designer-settings` allows silently switching any designer's notification preference without their knowledge.

**Fix category:** Add a shared secret check (internal-only header validated against an env var) for `/api/scrape-portfolio` and `/api/render`, since they are only intended to be called server-to-server. Add per-designer password verification or session check to `/api/designer-settings`.

---

#### User-supplied text interpolated into email HTML without escaping

**Category:** Security
**Severity:** High
**Location:** `app/api/submit/route.ts:186-203` (`rawAnswersHtml`), `app/api/submit/route.ts:348-351` (roomAssessment)

`rawAnswersHtml()` interpolates `body.name`, `body.email`, `body.additionalInfo`, and other free-text fields directly into HTML table cells with no entity escaping. A client who enters `<script>alert(1)</script>` as their name will have that string appear verbatim in the designer's notification email. While most modern email clients sanitize inline scripts, HTML injection can still produce malformed layouts, phishing-style content, or exfiltrate data via `<img src="...">` tags.

**Fix category:** HTML-escape all user-provided strings before interpolation into email HTML templates (replace `<`, `>`, `&`, `"`, `'` with their entity equivalents).

---

#### Render jobs can get stuck in `pending` indefinitely

**Category:** Reliability
**Severity:** High
**Location:** `app/api/render/route.ts`, `app/api/render-webhook/route.ts`, `app/results/[token]/page.tsx:151-155`

If Replicate's webhook never fires — due to a network timeout, Replicate-side error, or a crash in the render route after creating the prediction — `render_status` stays `'pending'` permanently. There is no cron, scheduled job, or TTL mechanism to flip stuck submissions to `'failed'`. The results page polls every 4 seconds with no maximum retry count or timeout (`setInterval` runs indefinitely while status is `'pending'`), so the client browser will poll forever.

**Fix category:** Add a background cron that queries for submissions with `render_status = 'pending'` and `created_at` older than a configurable threshold (e.g. 15 minutes) and marks them `'failed'`. Add a max-poll-count or elapsed-time ceiling in the results page polling logic.

---

#### No email retry logic — designer email failure leaves orphaned uploaded photos

**Category:** Reliability
**Severity:** High
**Location:** `app/api/submit/route.ts:424-443`

Photos are uploaded to Supabase Storage at step 1. Emails and brief generation run at step 4 via `Promise.allSettled`. If the designer email send fails, the route returns HTTP 500 at line 442 and the submission is never inserted (the `INSERT` to `submissions` is at step 5). The photos uploaded in step 1 are now orphaned in the `room-photos` bucket with no DB record pointing to them. Resend calls have no retry wrapper, backoff, or dead-letter queue.

**Fix category:** Insert the submission record before sending emails so the data is always persisted. Move email sending to a fire-and-forget path (like render generation). Add a retry wrapper with exponential backoff around Resend calls.

---

#### No error tracking or structured observability

**Category:** Observability
**Severity:** High
**Location:** All API routes — `app/api/submit/route.ts`, `app/api/render/route.ts`, `app/api/render-webhook/route.ts`, etc.

All error reporting is via `console.error()`. There is no Sentry, Datadog, LogRocket, or equivalent integration. In a Vercel serverless environment, `console.error` output is ephemeral (visible only in Vercel's real-time log stream, not searchable or alertable after the fact). Silent failures in critical paths — Groq brief generation, Replicate webhook, Claude Vision, Resend — are invisible unless someone is actively watching the log stream.

**Fix category:** Integrate a structured logging/error-tracking service (e.g. Sentry's Next.js SDK, which requires minimal setup). At minimum, add a persistent error log table in Supabase for critical path failures.

---

### Medium severity issues

#### `is_paid` boolean used in 6+ locations — migration will be wide

**Category:** Code quality / Architecture
**Severity:** Medium
**Location:** `app/api/submit/route.ts:34,473,480`, `app/api/render/route.ts:83`, `app/api/admin/data/route.ts:28`, `app/api/admin/designers/[slug]/route.ts:11`, `app/api/admin/designers/[slug]/toggle-plan/route.ts:16,22`

The `is_paid` boolean is acknowledged technical debt (CLAUDE.md notes it will become `plan_tier`). It currently drives the render-triggering decision in `/api/submit` and the designer fetch in `/api/render`. When Stripe integration lands and `plan_tier` is introduced as an enum, all six usage sites must be updated simultaneously. No migration strategy or abstraction layer exists to make this change safe.

**Fix category:** Wrap `is_paid` access behind a helper function (e.g. `isPro(designer)`) so the migration from boolean to enum requires changing one function, not six call sites.

---

#### Results page polls indefinitely with no client-side timeout

**Category:** Reliability
**Severity:** Medium
**Location:** `app/results/[token]/page.tsx:151-155`

The `setInterval(fetchData, 4000)` loop runs as long as `render_status === 'pending'`. If a render is stuck (see High issue above), the client browser will make API calls every 4 seconds indefinitely for as long as the tab is open. This wastes Supabase read quota and provides no feedback to the client that something went wrong.

**Fix category:** Add a poll counter or elapsed-time check; after N polls or M minutes, clear the interval and display an error state.

---

#### Admin GET designer route returns all columns including `dashboard_password_hash`

**Category:** Security
**Severity:** Medium
**Location:** `app/api/admin/designers/[slug]/route.ts:56` (`select('*')`)

The admin GET endpoint uses `select('*')` which returns the bcrypt hash of the designer's dashboard password to the admin panel client. While bcrypt hashes are not reversible in practice, returning credential material to the browser over the wire — even to an admin — is unnecessary and violates the principle of least exposure.

**Fix category:** Replace `select('*')` with an explicit column list that omits `dashboard_password_hash`.

---

#### Dashboard auth state stored in `sessionStorage` without expiry

**Category:** Security
**Severity:** Medium
**Location:** `app/dashboard/[slug]/page.tsx:147,235`

After successful bcrypt verification, the client stores `designlead_auth_<slug> = 'true'` in `sessionStorage`. This string flag has no expiry timestamp and is checked purely client-side. Any code running in the same origin (XSS, browser extensions) can set this flag and bypass the password screen. The `/api/dashboard-data` endpoint does not re-verify authentication — it trusts the slug in the query parameter.

**Fix category:** Issue a short-lived signed server-side session token (e.g. a JWT or a DB row) upon successful auth, and validate it server-side on every `/api/dashboard-data` call.

---

#### Uploaded photo signed URLs expire in 24 hours but are stored permanently in the database

**Category:** Data integrity
**Severity:** Medium
**Location:** `app/api/upload/route.ts:8,68-76`

`SIGNED_URL_TTL = 86400` (24 hours). The generated signed URLs are stored in `submissions.photo_urls` permanently. After 24 hours, photo links in the designer's notification email and any future dashboard feature that renders photos will be broken. Currently the dashboard doesn't render photos, so this is latent, but it is a data quality issue — the stored URLs are already expired for all submissions older than one day.

**Fix category:** Either store the storage path (not the signed URL) in the DB and generate fresh signed URLs at read time, or switch to public bucket URLs if the access control posture allows it.

---

#### No CSP headers configured

**Category:** Security
**Severity:** Medium
**Location:** `next.config.mjs`

`next.config.mjs` has no `headers()` configuration. There are no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` headers on any page or API route. The embed iframe use case has a CSP `frame-ancestors` directive mentioned in CLAUDE.md but it is not present in the actual config file.

**Fix category:** Add a `headers()` block to `next.config.mjs` setting at minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (with `frame-ancestors` exception for the embed route), and a baseline CSP.

---

#### No designer-facing data export

**Category:** Architecture / Compliance
**Severity:** Medium
**Location:** `app/dashboard/[slug]/page.tsx` (entire dashboard)

Designers cannot export their lead data in any format. For any EU-based designer (or client), GDPR Article 20 grants data portability rights. The dashboard has no CSV download, no JSON export, and no mechanism for a designer to retrieve their full submission history outside of the product UI. When a designer churns, their data is locked in the product.

**Fix category:** Add a CSV/JSON export endpoint behind the dashboard auth pattern, covering the designer's own submissions.

---

#### Lead quality regex is fragile — silently stores `null` on format change

**Category:** Reliability
**Severity:** Medium
**Location:** `app/api/submit/route.ts:341`

`/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i` will silently fail and store `null` in `lead_quality` if Groq alters its output format (adds a colon, wraps the section differently, etc.). There is no fallback, no logging of the parse failure, and no alert. `lead_quality` being null causes the dashboard badge to render `—` and prevents quality-based filtering in the admin panel.

**Fix category:** Log a warning when the regex fails to match so parse failures are visible in logs. Consider asking Groq to output structured JSON for the quality assessment rather than parsing prose.

---

### Low severity issues

#### `@fal-ai/client` dead dependency still in `package.json`

**Category:** Dependencies / Code quality
**Severity:** Low
**Location:** `package.json:13`

`"@fal-ai/client": "^1.9.5"` is listed as a production dependency. fal.ai was abandoned in favor of Replicate (documented in `memory.md`). The package is not imported anywhere in the codebase. It adds unnecessary attack surface, bundle weight, and signals to future maintainers that fal.ai may be in use.

**Fix category:** Remove the dependency and run `npm install` to update `package-lock.json`.

---

#### `@types/cheerio` version targets cheerio v0.x, not the installed v1.x

**Category:** Dependencies
**Severity:** Low
**Location:** `package.json:31`

`"@types/cheerio": "^0.22.35"` provides types for cheerio 0.x. The installed package is `"cheerio": "^1.2.0"` which ships its own TypeScript types. The stale `@types/cheerio` in devDependencies may cause type conflicts or provide incorrect type signatures for the v1 API.

**Fix category:** Remove `@types/cheerio` from devDependencies — cheerio 1.x is self-typed.

---

#### Budget ranges hardcoded in HUF in `IntakeForm.tsx`

**Category:** Architecture
**Severity:** Low
**Location:** `components/IntakeForm.tsx:36-41`

`BUDGET_RANGES` is hardcoded as HUF values in the component. This is not per-designer configurable. When the product expands beyond Hungarian designers, every designer's intake form will display HUF ranges regardless of their market. The per-designer customization surface exists (`style_keywords`, `rate_per_sqm`, etc.) but does not include currency or budget range options.

**Fix category:** Move budget ranges to a designer profile field (a `currency` or `budget_ranges_override` column) so they can be configured at signup.

---

#### Duplicate `@keyframes dl-shake` animation defined twice in dashboard page

**Category:** Code quality
**Severity:** Low
**Location:** `app/dashboard/[slug]/page.tsx:158`, `app/dashboard/[slug]/page.tsx:310`

The CSS `@keyframes dl-shake` block is defined in two separate inline `<style>` tags within the same file — once inside `PasswordScreen` and once at the top of the authenticated `DashboardPage` render. Since these components are mutually exclusive, it won't cause a runtime conflict, but it's a maintenance smell.

**Fix category:** Extract the animation to `app/globals.css` or a shared CSS module.

---

#### `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL` naming inconsistency

**Category:** Code quality / Reliability
**Severity:** Low
**Location:** `app/api/submit/route.ts:246`, `memory.md` (environment notes)

Server-side routes reference `process.env.SUPABASE_URL` (without `NEXT_PUBLIC_`), but `CLAUDE.md` documents `NEXT_PUBLIC_SUPABASE_URL` as the variable name. `memory.md` flags this discrepancy explicitly. If the wrong name is set in Vercel, the check at route startup silently fails to the 500 config-error path without surfacing which variable is missing.

**Fix category:** Standardize on a single name across env docs, CLAUDE.md, and code. Add startup-time env validation that logs which variable is absent by name.

---

## Part B — Verification of pre-identified concerns

### 1. Phase 4.5 admin panel single-tenant residue

**Status:** Not an issue
**Severity (if confirmed):** N/A
**Evidence:** `app/api/admin/data/route.ts`, `app/api/admin/designers/[slug]/route.ts`, `app/api/admin/submissions/route.ts`, `lib/adminAuth.ts`

All admin routes accept explicit `slug` or `id` path/query parameters and operate on whichever designer is specified. `verifyAdminAuth()` is a global password check with no designer-specific context. The admin data endpoint fetches all designers with counts, which is the correct multi-tenant posture. No implicit "current designer" assumption was found anywhere in the admin surface.

---

### 2. Dashboard password story inconsistencies

**Status:** Not an issue (with one adjacent bug noted)
**Severity (if confirmed):** N/A
**Evidence:** `app/api/dashboard-auth/route.ts:32-43`

`/api/dashboard-auth` looks up `dashboard_password_hash` by slug and calls `bcrypt.compare()`. There is no `DASHBOARD_PASSWORD` env var fallback anywhere in the route. The password story is clean post-Phase 4.6. The one adjacent issue is that admin-side password **generation** uses `Math.random()` rather than a CSPRNG (flagged separately as a High issue), but the password **verification** path is correct.

---

### 3. No rate limiting on `/api/submit`, `/api/onboard`, or `/api/upload`

**Status:** Confirmed issue
**Severity (if confirmed):** Critical
**Evidence:** `app/api/submit/route.ts:219-493`, `app/api/onboard/route.ts:24-109`, `app/api/upload/route.ts:10-81`

No rate limiting of any kind exists on any of the three routes. All three are reachable anonymously. `/api/submit` triggers Claude Vision (Anthropic), Groq, and optionally Replicate on every call. `/api/upload` writes to Supabase Storage. `/api/onboard` performs a bcrypt hash (CPU-bound) and a DB insert. A script calling these in a loop would produce uncontrolled API spend and storage growth with no automatic circuit breaker.

---

### 4. Render jobs can get stuck in `pending` state indefinitely

**Status:** Confirmed issue
**Severity (if confirmed):** High
**Evidence:** `app/api/render/route.ts:99-115`, `app/api/render-webhook/route.ts:96-99`, `app/results/[token]/page.tsx:151-155`

`/api/render` creates Replicate predictions and returns immediately — there is no polling for completion, only webhook receipt. If the webhook never arrives, the `render_status` column is never updated from `'pending'`. The render-webhook handler has a `failed` branch (line 96-99) that logs the failure but does not update `render_status` to `'failed'` (comment: "Only mark failed if all predictions have reported back as failed — for now just log"). The results page `setInterval` has no maximum iteration count or elapsed-time check — it will poll every 4 seconds indefinitely.

---

### 5. No email retry logic

**Status:** Confirmed issue
**Severity (if confirmed):** High
**Evidence:** `app/api/submit/route.ts:424-447`, `app/api/cron/digest/route.ts:137-147`

In `/api/submit`, `resend.emails.send()` is called once inside `Promise.allSettled()` with no retry. If it fails with a transient Resend 5xx, the designer email is lost and the submission is never inserted (the DB insert at step 5 is never reached). In the cron digest, each `resend.emails.send()` is caught and logged but not retried — a transient failure means that designer receives no digest for that day with no recovery mechanism.

---

### 6. Observability and logging gaps

**Status:** Confirmed issue
**Severity (if confirmed):** High
**Evidence:** All API routes — no imports of Sentry, Datadog, Pino, or any structured logging library found in `package.json` or any route file.

Every error path uses `console.error()`. Vercel's log retention on the Hobby plan is short and non-searchable after the fact. There is no error tracking service, no structured log format, no alerting on error rate thresholds, and no way to know after the fact that a run of submissions failed silently. The admin health panel provides a passive cron-health check but only when the admin manually visits it.

---

### 7. `is_paid` boolean still in use where `plan_tier` would be better

**Status:** Confirmed issue
**Severity (if confirmed):** Medium
**Evidence:** `app/api/submit/route.ts:34,473,480`, `app/api/render/route.ts:83`, `app/api/admin/data/route.ts:28`, `app/api/admin/designers/[slug]/route.ts:11`, `app/api/admin/designers/[slug]/toggle-plan/route.ts:16,22`

`is_paid` appears in 6 distinct files across the type definitions, DB queries, and business logic branches. This is acknowledged technical debt. No abstraction layer exists to simplify the future migration.

---

### 8. No designer-facing data export

**Status:** Confirmed issue
**Severity (if confirmed):** Medium
**Evidence:** `app/dashboard/[slug]/page.tsx` — no export button, link, or API call to any export endpoint.

Designers have no way to export their submission data. Given GDPR Art. 20 data portability requirements and the fact that the product processes personal data of EU residents (the client base is Hungarian), this is a compliance gap. No export endpoint exists anywhere in the API routes.

---

### 9. Client photos stored in public Supabase bucket with permanent URLs

**Status:** Partially present
**Severity (if confirmed):** Medium
**Evidence:** `app/api/upload/route.ts:8,68-76` (`SIGNED_URL_TTL = 86400`, `createSignedUrl`)

The bucket is not fully public in implementation — signed URLs with 24-hour TTL are used, which is better than a permanent public URL. However: (1) the signed URLs are stored permanently in `submissions.photo_urls` and become broken links after 24 hours — broken in the designer notification email and in any future dashboard photo view; (2) the bucket access control (public vs. private RLS) is ambiguous from code alone — `memory.md` notes "verify before changing"; (3) URLs are not revoked when a submission is archived; (4) photo path format (`${Date.now()}-${Math.random().toString(36).slice(2)}`) is low-entropy because `Math.random()` is not a CSPRNG, making paths theoretically guessable given timing knowledge.

---

### 10. Cron job monitoring

**Status:** Partially present
**Severity (if confirmed):** Medium
**Evidence:** `app/api/admin/health/route.ts:83-107` (`checkCron()`), `app/api/cron/digest/route.ts:150-157`

The digest cron logs completion to `admin_actions` with `action_type = 'cron_digest_completed'`. The health panel's `checkCron()` queries this table and flags degraded if the last run was over 28 hours ago. This is a passive health signal — it only surfaces when an admin manually navigates to the health panel. There is no active alerting (no webhook, no email, no PagerDuty integration) that fires if the cron silently stops running. Detection time for a silent cron failure is unbounded; it depends entirely on when the operator next checks the admin health panel.

---

## Cross-reference summary

| Issue | Found independently (Part A) | Confirmed in checklist (Part B) | Notes |
|-------|------------------------------|--------------------------------|-------|
| No rate limiting on public endpoints | Yes | Yes | Highest confidence — independently found and checklist-confirmed |
| Render jobs stuck in pending indefinitely | Yes | Yes | Both found and confirmed |
| No email retry logic | Yes | Yes | Both found and confirmed |
| No observability / error tracking | Yes | Yes | Both found and confirmed |
| `is_paid` boolean technical debt | Yes | Yes | Both found and confirmed |
| No designer data export | Yes | Yes | Both found and confirmed |
| Photo signed URLs expire, break in DB | Yes | Yes | Part A identified; Part B confirmed partially present |
| Cron monitoring passive-only | Yes | Yes (partial) | Part A found; Part B confirmed gap |
| Admin password timing attack | Yes | No | Part A novel discovery — not in checklist |
| CRON_SECRET in webhook URL | Yes | No | Part A novel discovery — not in checklist |
| Math.random() for password generation | Yes | No | Part A novel discovery — not in checklist |
| /api/scrape-portfolio, /api/render, /api/designer-settings unauthenticated | Yes | No | Part A novel discovery — not in checklist |
| XSS in email HTML | Yes | No | Part A novel discovery — not in checklist |
| Admin GET returns dashboard_password_hash | Yes | No | Part A novel discovery — not in checklist |
| Dashboard auth in sessionStorage (client-only) | Yes | No | Part A novel discovery — not in checklist |
| No CSP headers | Yes | No | Part A novel discovery — not in checklist |
| Lead quality regex fragile | Yes | No | Part A novel discovery — not in checklist |
| @fal-ai/client dead dependency | Yes | No | Part A novel discovery — not in checklist |
| @types/cheerio version mismatch | Yes | No | Part A novel discovery |
| Budget ranges hardcoded in HUF | Yes | No | Part A novel discovery |
| Duplicate dl-shake animation | Yes | No | Part A novel discovery |
| SUPABASE_URL naming inconsistency | Yes | No | Part A novel discovery — already documented in memory.md |
| Phase 4.5 single-tenant residue | No | No (Not an issue) | Checklist concern, independently not flagged, verified clean |
| Dashboard password story inconsistencies | No | No (Not an issue) | Checklist concern, verified clean |

---

## Recommended hardening priorities

Ordered by severity × exploitability × effort to fix:

**1. Rate limiting (Critical → fix first)**
Highest risk/reward ratio. One middleware integration protects all three endpoints simultaneously. An active exploit here causes direct financial damage via AI API overages with no recovery path.

**2. Unauthenticated AI-triggering endpoints** (`/api/scrape-portfolio`, `/api/render`, `/api/designer-settings`)
These are server-to-server internal routes exposed to the public internet. A shared internal secret (one env var) closes all three in under an hour of work. Lower priority than rate limiting only because an attacker needs a valid slug to exploit them, but that bar is low given the open onboarding flow.

**3. Render job stuck-pending failsafe + results page polling timeout**
These compound each other: a stuck render creates an infinite polling client session. A simple cron query + results page max-poll cap resolves both. The cron is particularly easy given the `admin_actions` logging infrastructure already in place.

**4. Email ordering + orphaned photo cleanup**
The designer email failure path that leaves orphaned storage objects is a data integrity bug that will accumulate silently. Reordering the submit route to insert the DB record first (before email) is a one-function change.

**5. Admin password security** (timing attack + CRON_SECRET in webhook URL)
These require slightly more design thought (session tokens, separate webhook secret) but represent real attack surface on the operator console. Prioritize after the cost-protection items.

**6. XSS in email HTML**
Simple to fix (HTML entity encoding helper applied to all user-provided strings), important to do before user growth increases the chance of a malicious submission.

**7. Observability**
Sentry's Next.js SDK is a one-file integration. Without it, silent failures in production are invisible. This should go in before Phase 5 launches and user volume increases.

---

## Items deliberately out of scope

- **Stripe integration gaps** — acknowledged as a future phase; no point auditing what isn't built yet.
- **RLS policies on Supabase tables** — acknowledged in `memory.md` as intentionally absent while all DB access is server-side. Would need revisiting if any client-side Supabase calls are ever introduced.
- **Single admin password not scalable** — acknowledged in `memory.md` as a pragmatic solo-operator choice.
- **`onboarding@resend.dev` sender** — acknowledged Resend free-tier constraint, not a code issue.
- **Hungarian-only language detection** — product scope decision, not an architecture defect.
- **Phase 5–7 features** — not yet built; no audit value.
- **Vercel Hobby 60s limit risks** — well-understood and mitigated by existing architecture; no new concerns found.
