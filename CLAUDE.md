# DesignLead — Agent Instructions

Read this file + `memory.md` at session start. Then act. Do not ask for permission to read files.

---

## What It Is

Multi-tenant SaaS for interior designers. Homeowners fill a form + upload photos → AI generates lead brief + response email draft → designer manages leads in dashboard.

**No free tier. No watermarks. Paid product only.**

---

## Current Phase

**Phase 4.10 is complete.** No active phase is currently defined. See PLAYBOOK.md section 10 for status and section 11 for next known work items.

---

## Tech Stack

- Next.js 14 App Router · React 18 · TypeScript
- Tailwind CSS + inline CSS custom properties
- Supabase (Postgres + Storage) free tier
- Claude `claude-sonnet-4-20250514` — response email drafts + portfolio scraping
- Claude `claude-sonnet-4-6` — room photo vision analysis (runs in `/api/submit`)
- Groq `llama-3.3-70b-versatile` — lead brief generation (fast, cheap)
- Replicate ControlNet depth — renders (Pro, **disabled via `NEXT_PUBLIC_RENDERS_ENABLED=false`**)
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
/                   ⚠️ VERIFY: redirect to /onboard or marketing landing page?
```

---

## Design System — "Noir Editorial × Warm Slate"

**CSS tokens (define as local CSS custom properties per component):**
```css
--dl-bg-page:        #0F0D0A;
--dl-bg-card:        #181510;
--dl-bg-elevated:    #1A1710;
--dl-accent:         #B8935A;
--dl-accent-dim:     rgba(184, 147, 90, 0.3);
--dl-accent-subtle:  rgba(184, 147, 90, 0.12);
--dl-text-primary:   #EDE5D0;
--dl-text-muted:     rgba(237, 229, 208, 0.35);
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
- Lead quality left-border: High = `2px solid #B8935A`, Medium = `2px solid rgba(184,147,90,0.3)`, Low = no border
- All `@keyframes` go in `app/globals.css`

**Spacing scale — 4px base unit. Only these values:**
4px · 8px · 12px · 16px · 24px · 32px · 48px · 64px

**Type scale:**
- 11px / 300 / uppercase / 0.14em → metadata labels, badges
- 13px / 300 → secondary body, muted descriptions
- 15px / 400 → primary body text
- 18px / 300 → lead card titles, form step labels
- 24px / 400 Playfair → stat numbers, studio names
- 32px / 400 Playfair → page headings

**States:**
- Loading: animated ellipsis only — no spinners, no skeletons
- Empty: single `--dl-text-muted` label centered — no illustrations, no CTAs
- Error: `--dl-text-muted` inline below field — no alert boxes, no icons

---

## Architectural Rules — Never Violate

- Multi-tenant via slugs — never hardcode designer env vars
- Every query on `designers` or `submissions` must filter `.is('archived_at', null)`
- Photos mandatory (min 1) on intake form — client + server validation
- Fire-and-forget renders — never block form submission on image generation
- `mailto:` links for designer response emails — do not replace with direct sending
- Always use `getSignedPhotoUrl()` from `lib/supabaseUtils.ts` — never raw storage paths
- Always use `isPro()` from `lib/designerUtils.ts` — never `is_paid` directly
- Always use `logError()` from `lib/errorLog.ts` — no bare `console.error` on critical paths

---

## Operating Rules

1. **Read before writing.** Check `app/`, `components/`, `lib/` before creating anything new. No duplicate components or utilities.
2. **Preserve working functionality.** All shipped phases are live. Don't break intake → brief → email → render → dashboard.
3. **Stay in the design system.** No new colors, no new fonts, no new border-radius values outside the rules above.
4. **No speculative work.** Stay within the defined phase scope. Check PLAYBOOK.md section 11 for what's next.
5. **Ask before spending.** Any change triggering Replicate, Claude, or Resend costs during testing — confirm first.
6. **Update memory.md** when a new lesson has lasting value.
