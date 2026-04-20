# DesignLead — Agent Instructions

Read this file + `memory.md` at session start. Then act. Do not ask for permission to read files.

---

## What It Is

Multi-tenant SaaS for interior designers. Homeowners fill a form + upload photos → AI generates lead brief + response email draft → designer manages leads in dashboard.

**No free tier. No watermarks. Paid product only.**

---

## Current Phase

**Phase 4.10 — Frontend polish.** No API routes. No schema changes. UI only.

Stay inside the phase. Do not build ahead.

---

## Tech Stack

- Next.js 14 App Router · React 18 · TypeScript
- Tailwind CSS (with inline CSS vars — see Design System below)
- Supabase (Postgres + Storage) free tier
- Claude `claude-sonnet-4-20250514` — briefs + emails
- Groq `llama-3.3-70b-versatile` — fast brief scoring
- Replicate ControlNet depth — renders (Pro, **currently disabled via `NEXT_PUBLIC_RENDERS_ENABLED=false`**)
- Resend — email, free tier
- Vercel Hobby — **60s max function duration, hard limit**

---

## URL Structure

```
/a/[slug]           designer's client-facing intake form
/a/[slug]/embed     chromeless iframe version
/dashboard/[slug]   password-protected designer dashboard
/results/[token]    token-gated render results page
/onboard            designer signup
/admin              operator panel (single password)
/                   redirects to /onboard (future: marketing site)
```

---

## Key Files

```
CLAUDE.md                         this file
memory.md                         lessons + locked decisions — read every session
lib/flags.ts                      RENDERS_ENABLED feature flag
lib/designerUtils.ts              isPro() — use instead of is_paid directly
lib/errorLog.ts                   logError() — use on all critical paths
lib/internalAuth.ts               internal API secret verification
lib/supabaseUtils.ts              getSignedPhotoUrl() — always use for photo URLs
components/IntakeForm.tsx         client-facing 3-step intake form
components/OnboardForm.tsx        designer signup form
app/dashboard/[slug]/page.tsx     designer dashboard
app/results/[token]/page.tsx      client results page
app/globals.css                   global styles + @keyframes
workflows/                        markdown SOPs per phase
```

---

## Design System — "Noir Editorial × Warm Slate"

**CSS tokens (define as local CSS custom properties per component):**
```css
--dl-bg-page:       #0F0D0A;
--dl-bg-card:       #181510;
--dl-bg-elevated:   #1A1710;
--dl-accent:        #B8935A;
--dl-accent-dim:    rgba(184, 147, 90, 0.3);
--dl-accent-subtle: rgba(184, 147, 90, 0.12);
--dl-text-primary:  #EDE5D0;
--dl-text-muted:    rgba(237, 229, 208, 0.35);
--dl-border-default: rgba(255, 255, 255, 0.05);
--dl-border-accent:  rgba(184, 147, 90, 0.2);
--dl-rule-gradient:  linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%);
```

**Fonts:**
- Playfair Display — studio/designer names and stat numbers only
- Montserrat — everything else (200 body, 300 labels, 400 buttons)

**Rules — non-negotiable:**
- Border-radius: **2px** everywhere except card containers (**6px**). Badges + inputs stay 2px.
- No shadows except focus rings
- No gradients except page background + `--dl-rule-gradient`
- Hover: border-color + background transitions only, 0.2s ease. No transform, no scale
- Uppercase labels, letter-spacing 0.14–0.2em
- Hairline gradient rule under every major section header
- Lead quality left-border: High = `2px solid --dl-accent`, Medium = `2px solid --dl-accent-dim`, Low = no border

**All @keyframes go in `app/globals.css`.**

---

## Phase 4.10 Scope

Touch only these UI surfaces. Nothing else.

1. **Dashboard** — stats header, lead cards with left-border quality signal, progressive disclosure expand, empty state, filter/sort bar, password screen
2. **Intake form** — three named steps (Rólad / A térről / Képek és részletek), typography hierarchy, input styling, photo upload zone, submit loading state. **Web-first, desktop layout.**
3. **Onboarding form** — three named steps (Bemutatkozás / A stílusod / Beállítások), password strength indicator, confirmation screen
4. **Results page** — apply new tokens, graceful holding state (renders disabled)
5. **Micro-animations** — field focus, card hover, card expand (max-height), form fade-in, submit loading ellipsis. All @keyframes in globals.css.

---

## Architectural Rules — Never Violate

- Multi-tenant via slugs — never hardcode designer env vars
- Every query on `designers` or `submissions` must filter `.is('archived_at', null)`
- Photos mandatory (min 1) on intake form — client + server validation
- Fire-and-forget renders — never block form submission on image generation
- `mailto:` links for designer response emails — do not replace with direct sending
- Always use `getSignedPhotoUrl()` from `lib/supabaseUtils.ts` — never use raw storage paths
- Always use `isPro()` from `lib/designerUtils.ts` — never use `is_paid` directly
- Always use `logError()` from `lib/errorLog.ts` — no bare `console.error` on critical paths

---

## Operating Rules

1. **Read before writing.** Check existing code in `app/`, `components/`, `lib/` before creating anything new. No duplicate components or utilities.
2. **Preserve working functionality.** All shipped phases are live. Don't break intake → brief → email → render → dashboard.
3. **Stay in the design system.** No new colors, no new fonts, no new border-radius values outside the rules above.
4. **No speculative work.** Phase 4.10 is UI only. Do not touch API routes, DB schema, or cron jobs.
5. **Ask before spending.** Any change triggering Replicate, Claude, or Resend costs during testing — confirm first.
6. **Update memory.md** when a new lesson has lasting value. Update workflows when a process changes.

---

## Environment Variables (current full list)

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

`DASHBOARD_PASSWORD` env var is fully deprecated. Per-designer `dashboard_password_hash` in Supabase is the auth mechanism.
