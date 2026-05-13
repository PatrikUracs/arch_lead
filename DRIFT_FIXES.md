# DRIFT_FIXES — CLAUDE.md + memory.md audit vs PLAYBOOK.md
Date: 2026-05-08

---

## STALE fixes applied (6)

[STALE] `CLAUDE.md`:28 — "Claude `claude-sonnet-4-20250514` — briefs + emails / Groq — fast brief scoring" → Split into three correct entries: Claude for email drafts + portfolio scraping; Claude `claude-sonnet-4-6` for vision; Groq for brief generation.

[STALE] `CLAUDE.md`:17–19 — "Phase 4.10 — Frontend polish + motion system. No API routes. No schema changes. UI only. Stay inside the phase. Do not build ahead." → "Phase 4.10 is complete. No active phase defined. See PLAYBOOK.md section 10."

[STALE] `CLAUDE.md`:99–106 — Entire "Phase 4.10 Scope" section (5 bullet items describing in-progress work) → Removed. Work is shipped; scope list is no longer instructive.

[STALE] `CLAUDE.md`:127 — "No speculative work. Phase 4.10 is UI only. Do not touch API routes, DB schema, or cron jobs." → "No speculative work. Stay within the defined phase scope. Check PLAYBOOK.md section 11 for what's next."

[STALE] `CLAUDE.md`:45 — "/ → redirects to /onboard (future: marketing site)" → "/ → ⚠️ VERIFY: redirect to /onboard or marketing landing page?" (aligns with PLAYBOOK.md section 3)

[STALE] `memory.md` — Section headers "Security (Phase 4.8)", "Fixed Layer / Motion System Lessons (Phase 4.10)", "Design System Lock-In (Phase 4.10)" → Phase labels stripped from all three headers. Content unchanged.

---

## CONFLICTs — requires your decision (1)

[CONFLICT] Light mode design system — PLAYBOOK.md section 7 is dark-only and carries a ⚠️ VERIFY note. However, `app/globals.css` contains active `[data-theme="light"]` and `@media (prefers-color-scheme: light)` blocks with the full light-mode palette from `memory/project_light_mode_palette.md`. `app/layout.tsx` has a theme-detection script that reads `localStorage` and `prefers-color-scheme` and sets `data-theme` on `<html>`. `components/ThemeToggle.tsx` exists as a component.
— Options:
  A) Light mode is **shipped** — update PLAYBOOK.md section 7 to document the dual-mode token system (palette already in `memory/project_light_mode_palette.md`). Remove the ⚠️ VERIFY note.
  B) Light mode is **exploratory / not wired into any page** — audit whether ThemeToggle is actually rendered anywhere, then remove `[data-theme="light"]` blocks from globals.css and delete ThemeToggle.tsx. Update memory entry to STALE.
— My recommendation: Verify whether ThemeToggle is rendered in any layout or page. If yes → A. If it's an uncommitted orphan → B.

---

## GAPs — in CLAUDE.md / memory.md but not in PLAYBOOK.md (3)

[GAP] `memory.md` → "Slug generation" entry documents the reserved slug list source, diacritic rules, and dedup logic. PLAYBOOK.md section 4 references `memory.md` as the source of truth and includes a summary. — Recommend adding to PLAYBOOK.md? **N** — PLAYBOOK already cites memory.md as authoritative here; duplication adds maintenance burden.

[GAP] `CLAUDE.md` → Spacing scale (4px base unit, 8 allowed values). Not in PLAYBOOK.md. — Recommend adding to PLAYBOOK.md? **Y** — It's a non-negotiable design constraint that an agent needs when writing components.

[GAP] `CLAUDE.md` → Operating Rules 1–3 and 5–6 (read before writing, preserve working functionality, stay in design system, ask before spending, update memory.md). These are agent behavioral instructions, not engineering facts. — Recommend adding to PLAYBOOK.md? **N** — These belong in CLAUDE.md as agent operating instructions. PLAYBOOK.md is an engineering reference, not an agent instruction file.

---

[CONFLICT RESOLVED] Light mode — verdict: SHIPPED. ThemeToggle retained. PLAYBOOK.md updated to document dual-mode system.

---

## Light mode verdict

**CONFLICT** — Light mode tokens are live in `app/globals.css` and a theme toggle component exists. The design system is dual-mode in code. The `memory/project_light_mode_palette.md` entry is accurate, not stale. No automatic fix applied. See CONFLICT entry above for resolution options.

No changes made to `app/globals.css`, `components/ThemeToggle.tsx`, or `memory/project_light_mode_palette.md`.

---

## Note: "Phase 4.7 Audit" check
No reference to "Phase 4.7 Audit" found anywhere in `CLAUDE.md`. Nothing to remove.
