# DesignLead — Agent Instructions

You are working on **DesignLead**, a production SaaS built with the WAT architecture (Workflows, Agents, Tools). Read this file at the start of every session to load full project context before touching any code. Also read `memory.md` for past lessons, external service quirks, and decisions that shouldn't be repeated or reversed.

---

## What DesignLead Is

DesignLead is an AI-powered lead qualification and client communication tool for freelance interior designers and architects. Homeowners fill out an intake form on the designer's branded page, upload photos of their space, and the designer receives a qualified lead brief plus an AI-drafted response email — ready to review and send directly from the dashboard via a mailto: link. AI-generated concept renders of the client's space are available on the Pro tier.

The product replaces vague "how much does it cost?" inquiries with structured, pre-qualified briefs, and automates the slowest part of a designer's day: writing thoughtful, personalized responses to every new lead.

**Business model:** Fully paid product. No free tier, no watermarks.

- **Base tier** — Intake form, AI lead qualification + brief, AI-drafted response email (language-aware, tone-matched), adaptive questionnaire, automated follow-up sequence, built-in meeting scheduler
- **Pro tier** — Everything in Base + AI concept renders of the client's space

Stripe is not yet integrated — plan/tier is currently set manually in Supabase via the `is_paid` column, which will be repurposed into a proper `plan_tier` column in a future phase.

---

## The WAT Architecture

**Layer 1 — Workflows (`workflows/`)**
Markdown SOPs defining what to do and how. Each workflow covers one outcome: objective, required inputs, tools used, expected outputs, edge cases, known issues.

**Layer 2 — Agent (your role)**
Read the relevant workflow, coordinate tools, handle failures, ask clarifying questions when needed. You connect intent to execution without doing everything yourself.

**Layer 3 — Tools**
Next.js API routes, server actions, utility scripts in `tools/`. Deterministic, testable, fast. All secrets in `.env.local`.

**Why this matters:** When AI handles every step directly, accuracy drops fast. By offloading execution to deterministic routes and scripts, you stay focused on orchestration.

---

## Phase Status

- **Phase 1** — Intake form + AI brief + email delivery. COMPLETE
- **Phase 2** — Photo upload + Claude Vision analysis + designer profiles. COMPLETE
- **Phase 3** — AI concept renders + dashboard + results page. COMPLETE
- **Phase 4** — AI-drafted response email (base tier) + free-tier cleanup. COMPLETE
- **Phase 5** — Adaptive questionnaire (room-type-specific questions). PLANNED
- **Phase 6** — Automated follow-up sequence (cron-driven nudges). PLANNED
- **Phase 7** — Built-in meeting scheduler (replaces Calendly dependency). PLANNED
- **Future** — Stripe integration, multi-language expansion beyond Hungarian

Stay inside the current phase. Do not build ahead.

---

## Tech Stack (current production state)

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS — dark luxury palette, see Design System below
- **Database & Storage:** Supabase (Postgres + Storage), free tier
- **AI — lead briefs and response emails:** Anthropic Claude (`claude-sonnet-4-20250514`)
- **AI — fast paths:** Groq (used where speed matters more than quality)
- **AI — image generation:** Replicate running ControlNet depth (`jagilley/controlnet-depth`) (~$0.02/render set of 3). Pro tier only
- **Email:** Resend (free tier, 3,000/mo) — instant notifications + daily digest via Vercel Cron
- **Client email sending:** `mailto:` links from dashboard — designer sends from their own email client. No Gmail/Outlook OAuth integration (pragmatic choice, upgradable later)
- **Deployment:** Vercel Hobby plan — important constraint: 60s max function duration
- **Cron:** Vercel Cron (free), runs `/api/cron/digest` at 8:00 UTC daily. Phase 6 adds a second cron for follow-up sequences

---

## Language Handling

Current user base is Hungarian. All AI-generated content (briefs, response emails, follow-ups) should detect the client's language from their submitted text and respond in that language. Claude handles this natively. Default fallback when language is ambiguous: Hungarian.

Subject lines and system-generated UI copy for clients use Hungarian templates by default. English templates exist for future expansion but are not actively used yet.

---

## API Routes

**Current (Phases 1–3):**

- `/api/submit` — receives intake form, runs AI lead scoring (Claude + Groq), stores to Supabase, triggers instant email, kicks off render generation as background job. Phase 4 adds AI response email draft generation to this route
- `/api/render` — generates 3 concept renders via Replicate ControlNet depth (preserves room geometry from first uploaded photo), stores URLs in Supabase, emails client link to results page. Prompt uses `ai_style_profile` if available, falls back to `style_keywords`. Pro tier only
- `/api/scrape-portfolio` — background job triggered after onboarding: fetches designer's portfolio URL, extracts/uploads images to `designer-portfolios` bucket, runs Claude Vision analysis to populate `ai_style_profile`
- `/api/upload` — handles photo uploads to Supabase Storage (`project-photos` bucket)
- `/api/dashboard-data` — serves lead data to designer dashboard
- `/api/onboard` — registers new designer profiles (studio name, style keywords, rates, Calendly URL, notification preference, response tone)
- `/api/cron/digest` — daily digest for designers with `notification_preference = 'digest'`. Protected by `CRON_SECRET` bearer token
- `/api/results-data` — serves render results to client via token-gated URL
- `/api/submissions/[id]/status` — updates lead status from dashboard (New / Contacted / Converted / Not a fit)

**Planned (Phases 5–7):**

- `/api/cron/follow-up` — Phase 6, daily cron that sends nudge emails for stale leads
- `/api/schedule/request` — Phase 7, client submits proposed meeting times
- `/api/schedule/confirm` — Phase 7, designer confirms a selected time slot

## Pages

- `/` — intake form (the main client-facing page, per designer deployment)
- `/embed` — chromeless version of the intake form for iframe embedding on designer websites
- `/embed-instructions` — copy-paste iframe snippet for designers
- `/onboard` — designer signup form (one-time setup). Phase 4 adds `response_tone` field
- `/dashboard` — password-gated lead management view (metrics + table + status dropdowns + notification settings). Phase 4 adds "Draft response" action per row
- `/results/[token]` — client results page showing renders, brief summary, and Calendly CTA. Post-Phase-4: watermark logic removed, all results pages render clean

## Key Components

- `components/IntakeForm.tsx` — the three-section form (Your space / Your vision / Tell us more) with mandatory photo upload
- `components/OnboardForm.tsx` — designer onboarding form

---

## Database Schema (Supabase)

**Table: `designers`**
```
id                        uuid primary key
slug                      text unique
full_name                 text
studio_name               text
portfolio_url             text
style_keywords            text[]
typical_project_size      text
rate_range                text
bio                       text
calendly_url              text
is_paid                   boolean default false      -- legacy free/paid flag; will be repurposed into plan_tier in a future phase
notification_preference   text default 'instant'     -- 'instant' | 'digest'
portfolio_image_urls      text[]                     -- scraped from portfolio_url, uploaded to designer-portfolios bucket
ai_style_profile          text                       -- Claude Vision analysis of portfolio images, used as render prompt base
portfolio_scrape_status   text default 'pending'     -- 'pending' | 'complete' | 'failed'
response_tone             text                       -- 'warm' | 'professional' | 'enthusiastic', nullable fallback to 'warm and personal'
created_at                timestamp
```

**Table: `submissions`**
```
id                   uuid primary key
designer_slug        text
client_name          text
client_email         text
room_type            text
room_size_m2         integer
design_style         text
budget_range         text
timeline             text
additional_info      text
photo_urls           text[]                         -- mandatory, min 1 max 3
ai_brief             text
lead_quality         text                           -- 'High' | 'Medium' | 'Low'
ai_response_draft    text                           -- AI-drafted client response email body, null on generation failure (non-fatal)
ai_response_subject  text                           -- subject line from hard-coded template; language detected via Hungarian char regex on additional_info
render_urls          text[]                         -- Pro tier only
render_status        text default 'pending'         -- 'pending' | 'complete' | 'failed' | 'not_applicable' for base tier
results_page_token   text                           -- unguessable UUID
status               text default 'New'             -- 'New' | 'Contacted' | 'Converted' | 'Not a fit'
created_at           timestamp
```

**Storage bucket:** `project-photos` (public) — path format `submissions/[timestamp]-[random-id]/[filename]`
**Storage bucket:** `designer-portfolios` (public) — path format `[designer_slug]/portfolio-[index].[ext]`

---

## Environment Variables

All secrets in `.env.local` — never hardcode, never commit.

```
# AI
ANTHROPIC_API_KEY=
GROQ_API_KEY=
REPLICATE_API_TOKEN=

# Email
RESEND_API_KEY=

# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Per-deployment designer identity
DESIGNER_SLUG=
DESIGNER_EMAIL=
DESIGNER_NAME=

# Dashboard
DASHBOARD_PASSWORD=

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Design System

The UI uses the "Obsidian & Champagne" palette — dark, editorial, luxury. Do not deviate.

**Colors:**
- Page background: `#0A0A0A` with radial vignette to `#141414` at center
- Card background: `#111111`
- Card border: `rgba(201, 169, 110, 0.4)` at 1px
- Primary accent: `#C9A96E` (champagne gold)
- Body text: `#F5F0E8`
- Muted text: `rgba(245, 240, 232, 0.45)`
- Input background: `#1A1A1A`
- Input border default: `rgba(201, 169, 110, 0.15)`
- Input border focus: `#C9A96E`
- Error: `#C0614A`

**Fonts (Google Fonts):**
- Playfair Display weight 400/500 — designer names, section headings
- Montserrat weight 200 — body text
- Montserrat weight 300 — labels
- Montserrat weight 400 — buttons only

**Rules:**
- Border-radius: 2px maximum everywhere — stay sharp and architectural
- No gradients other than page background vignette
- No shadows on inputs or buttons other than focus ring
- All transitions 0.2–0.25s ease
- Uppercase labels with letter-spacing 0.14–0.2em
- Hairline dividers `rgba(201, 169, 110, 0.08–0.2)` — never solid lines

---

## Vercel Hobby Constraints

Function duration is capped at 60 seconds. This matters for:

- `/api/submit` — AI calls must stay fast. Groq handles speed-sensitive paths, Claude handles quality-sensitive paths. Phase 4 adds a second Claude call for response email drafting — must complete inside the same 60s budget as the brief
- `/api/render` — image generation is the longest operation. Must run as a background fire-and-forget job triggered from `/api/submit`, never blocking the user. Client sees instant thank-you; renders complete asynchronously and results page polls Supabase every 4s
- Never make the intake form's thank-you screen wait on image generation or response email drafting

If a route approaches 60s, something is architecturally wrong — rework it, don't extend it. Cron routes for digests and follow-ups have separate timeout budgets but should still be efficient.

---

## How to Operate

**1. Check existing code before creating anything new.**
Read the relevant files in `app/`, `components/`, or `workflows/` first. Do not duplicate API routes, components, or utility functions.

**2. Preserve working functionality.**
All shipped phases are live. When adding or modifying, never break existing flows: intake → brief → response draft → email → render → results page → dashboard. Test the full end-to-end path after any meaningful change.

**3. Stay inside the design system.**
No new colors, no new fonts, no new border-radius values. If a component needs a new pattern, derive it from the existing tokens.

**4. Respect the 60s Vercel Hobby limit.**
Any new long-running work is a background job, not a synchronous call.

**5. Learn from failures — and update workflows and memory.md.**
When you hit an error:
- Read the full stack trace
- Fix the route or script
- Retest (if it uses paid APIs — Claude, Replicate — confirm before rerunning repeatedly)
- Update the relevant workflow in `workflows/` with what you learned (rate limits, timing quirks, unexpected behavior)
- Add a new entry to `memory.md` if the lesson has long-term value beyond one workflow

Do not create or overwrite workflows without asking unless explicitly told to.

**6. AI prompt discipline.**
The brief generation prompts, response email prompts, and render prompts are defined in workflows. Use them exactly — do not improvise variations. If a prompt needs changing, propose the change first.

**7. Ask before spending.**
Any change that would incur non-trivial Replicate, Claude, or Resend costs during testing — pause and confirm first. Budget is currently tight.

**8. Stay inside the current phase.**
Phases 5, 6, and 7 are planned but not started. Do not build them speculatively. Phase boundaries exist so each phase can be validated before the next begins.

---

## File Structure

```
.env.local                    # All secrets (gitignored)
next.config.js                # Contains frame-ancestors CSP for iframe embeds
vercel.json                   # Cron job config
CLAUDE.md                     # This file — read at start of every session
memory.md                     # Long-term lessons, service quirks, locked decisions
app/
  page.tsx                    # Intake form
  embed/page.tsx              # Chromeless intake form for iframe
  embed-instructions/page.tsx
  onboard/page.tsx
  dashboard/page.tsx
  results/[token]/page.tsx
  api/
    submit/route.ts
    render/route.ts
    scrape-portfolio/route.ts
    upload/route.ts
    onboard/route.ts
    dashboard-data/route.ts
    results-data/route.ts
    submissions/[id]/status/route.ts
    cron/digest/route.ts
components/
  IntakeForm.tsx
  OnboardForm.tsx
workflows/
  phase1_intake.md
  phase2_vision.md
  phase3_render.md
  phase4_response_email.md    # Created during Phase 4 build
  digest_email.md
tools/                        # Utility scripts
.tmp/                         # Disposable temporary files
```

---

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the route or tool
3. Verify the fix works end-to-end
4. Update the workflow with the new approach, and `memory.md` if the lesson has lasting value
5. Move on with a more robust system

---

## Bottom Line

DesignLead is a live paid product across three shipped phases with four more planned. Your job is to maintain it, extend it carefully per the phase roadmap, and keep it honest. Respect the design system, respect the Vercel limits, respect the existing architecture. When in doubt, ask.
