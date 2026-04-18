# DesignLead — Memory & Lessons

A record of things that broke, surprised, or required non-obvious solutions. Read this at the start of every session alongside CLAUDE.md. Update this file whenever a new lesson is learned — never throw these away.

---

## External service quirks

**Replicate / ControlNet depth (`jagilley/controlnet-depth`)**
Switched from FLUX Schnell to ControlNet depth to preserve client room geometry in renders. The model is called with a pinned version hash `865a52cfc447e048994ea6d4038ba65d6d74c574162b6f54ba4b3cd25c0e0e4b`. The `num_samples` input must be passed as the string `'1'`, not the integer `1`. The output array may contain multiple images even when `num_samples: '1'` — always extract `[0]`. Three renders are now generated in parallel via `Promise.all` (no 12s delay) because ControlNet has different rate limits than FLUX Schnell. If rate limits become a problem, re-add staggering. Cost is approximately $0.007/call × 3 = ~$0.02 per submission.

**Replicate / FLUX Schnell (retired)**
The SDK's `replicate.run()` does not always return a plain string URL. The output can be an array of strings, an array of objects with a `.url()` method, or an array of objects with a `.url` property. The current `generateOne()` function in `app/api/render/route.ts` handles all three cases explicitly; do not simplify this without testing against the live SDK. Additionally, three renders are generated sequentially (not in parallel) with a 12-second delay between each call (`setTimeout(r, 12000)`) — this is a deliberate rate-limit precaution, not an oversight. Removing it risks hitting Replicate's per-second limits.

**Portfolio scraping with cheerio**
`/api/scrape-portfolio` fetches the designer's portfolio URL as plain HTML and parses `<img>` tags with cheerio. This works for static sites (Squarespace, standard WordPress). For SPA portfolios (Webflow with JS rendering, fully React-based sites) the HTML will have few or no `<img>` tags — the scrape returns 0 images and `portfolio_scrape_status` is set to `'failed'`. The app handles this gracefully: `ai_style_profile` stays null and renders fall back to `style_keywords`. Additionally checked for `data-src` and `data-lazy-src` lazy-load attributes. Width/height filter (< 200) is applied to HTML attributes only — CSS-sized images are not filtered by size. If a designer's site uses a CDN that rewrites image URLs, resolved absolute URLs may still hit the filter incorrectly; test with the actual portfolio URL if scrape yields zero results.

**fal.ai (abandoned)**
The project originally used fal.ai for image generation. It was replaced with Replicate after a series of failures: the `subscribe()` method's response needed `.data` unwrapped, errors were swallowed silently, and debugging required multiple commits with added logging. The git history (commits `6330d60`, `6ebd8e4`, `b437e87`) documents this. Do not revisit fal.ai without a strong reason.

**Resend**
All outbound email uses `onboarding@resend.dev` as the sender address, not a custom domain. This is a Resend free-tier constraint — custom `from` domains require domain verification. The display name is set dynamically (designer name or studio name), but the underlying address is always `onboarding@resend.dev`. Changing this requires completing Resend's domain setup. The client confirmation email failure is intentionally non-fatal: if it fails after the designer email succeeds, the submission still returns 200 (see `app/api/submit/route.ts`, the second `resend.emails.send` call).

**Supabase Storage**
Photos are uploaded to the `room-photos` bucket (note: CLAUDE.md references `project-photos` — the actual bucket name in the upload route is `room-photos`, see `app/api/upload/route.ts` line 61). Signed URLs are generated with a 24-hour TTL (`SIGNED_URL_TTL = 86400`). This is intentional: long enough for Claude Vision to fetch the image and for the designer to click the photo links in the notification email. After 24 hours the links expire. The bucket is referenced as public in CLAUDE.md but the route uses signed URLs, which suggests it may not be fully public — verify before changing.

**Anthropic Claude (Vision)**
Claude Vision is used only in `/api/submit` for room photo analysis. The call is made in parallel with fetching the designer profile (`Promise.all`). If the Vision call fails, it returns an empty string and the brief is generated without room context — it is explicitly non-blocking (see `app/api/submit/route.ts`, `analyseRoomPhotos`, the catch block returns `''`). The model is pinned to `claude-sonnet-4-6`.

**Groq**
Groq is the primary brief generation model (`llama-3.3-70b-versatile`). It is used instead of Claude for this step because speed matters more than quality here — the form submission must respond quickly. If Groq fails, the entire `/api/submit` route returns a 500; there is no Claude fallback currently implemented despite what CLAUDE.md implies.

**Vercel Cron**
The digest cron runs at `0 8 * * *` UTC (8:00 AM UTC daily), defined in `vercel.json`. It is protected by a `CRON_SECRET` bearer token. If `CRON_SECRET` is not set, the check is skipped and any caller can trigger the digest — this is a development convenience that should be closed before multi-tenant expansion. The cron only sends emails to designers with `notification_preference = 'digest'`; designers with `'instant'` preference receive no digest.

---

## Code-level decisions worth remembering

**Render generation is fire-and-forget via `waitUntil`**
The render job is triggered from `/api/submit` using `waitUntil()` from `@vercel/functions`. This keeps the form submission response fast (user sees thank-you immediately) while the render continues in the background after the response is sent. The results page then polls `/api/results-data` every 4 seconds until `render_status` changes from `pending` to `complete` or `failed` (see `app/results/[token]/page.tsx`). This architecture exists because render generation takes 30–50 seconds for 3 images and Vercel Hobby functions time out at 60 seconds — blocking the form submission on render generation would regularly fail.

**Polling instead of webhooks on the results page**
The results page polls Supabase every 4 seconds rather than using Replicate webhooks or server-sent events. This was chosen for simplicity: no webhook endpoint to secure, no persistent connection to manage, and 4-second polling is fast enough for a user waiting on renders. The poll stops automatically once status is no longer `pending`.

**`maxDuration = 60` on the render route**
`app/api/render/route.ts` sets `export const maxDuration = 60`. This was explicitly reduced from a higher value to comply with Vercel Hobby plan limits (git commit `14d03fc`). The render route is the one function that actually needs the full 60 seconds.

**Lead quality is parsed from the Groq output with a regex**
The `lead_quality` column is populated by parsing the last line of the AI brief with `/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i` (see `app/api/submit/route.ts`). If Groq changes its output format or adds extra whitespace, this parse silently fails and `lead_quality` is stored as `null`. This is a fragile coupling to the prompt format.

**`is_paid` is set manually in Supabase**
There is no Stripe integration. The `is_paid` boolean on the `designers` table controls whether renders appear with or without the "Preview — DesignLead" watermark overlay. To upgrade a designer, update the row directly in Supabase. Do not build anything that assumes programmatic payment state changes until Stripe is integrated.

**Designer identity comes from env vars, not session**
There is no authentication for the designer. The deployed instance knows which designer it belongs to via `NEXT_PUBLIC_DESIGNER_SLUG`, `DESIGNER_EMAIL`, and `DESIGNER_NAME` environment variables. The dashboard is protected only by a plaintext password in `DASHBOARD_PASSWORD`. This design means each designer gets their own Vercel deployment with their own env vars — it is a single-tenant architecture per deployment.

**Onboard route uses an `ONBOARD_SECRET` key**
The `/api/onboard` route accepts a `key` field in the request body and checks it against `process.env.ONBOARD_SECRET`. If `ONBOARD_SECRET` is not set, the check is skipped entirely and anyone can create or overwrite a designer profile. This is gated by obscurity in production. The route uses `upsert` with `onConflict: 'slug'`, so re-running onboarding with the same slug overwrites the existing profile.

**Budget ranges are denominated in HUF**
The intake form hard-codes budget ranges in Hungarian Forints (`IntakeForm.tsx`, `BUDGET_RANGES` array). This is not configurable per designer. Any multi-currency or multi-market expansion requires refactoring these options out of the component.

**The results page shows only brief sections 1 and 2 to the client**
`extractBriefSections()` in `app/results/[token]/page.tsx` parses the AI brief and surfaces only the first two numbered sections (Project summary and Client profile) to the client. Sections covering budget fit, scope assessment, and the recommended next step (which includes the lead quality rating) are intentionally hidden from the client — they are for the designer's eyes only in the email.

---

## Known edge cases

**Replicate output is not always a string**
Handled by the multi-branch URL extraction in `generateOne()` (`app/api/render/route.ts`, lines 36–48). If the output resolves to `'[object Object]'` after all attempts, an error is thrown and render status is set to `failed`.

**Photos array empty or non-array**
Both the upload route and the submit route validate that `photoUrls` is a non-empty array. The client-side form also requires at least one photo before allowing submission. Edge case: if a user somehow bypasses the form and POSTs to `/api/submit` with `photoUrls: []`, the server returns a 400.

**Room size out of range**
Validated on both client (min 10, max 500) and server. If `roomSize` is `NaN` or outside that range, the server returns 400.

**Designer profile not found**
If `fetchDesignerProfile()` fails or returns null (e.g., slug not in the `designers` table), the brief is still generated but without designer context. The render prompt falls back to `'contemporary, refined'` as the style keywords default (see `buildPrompt()` in `app/api/render/route.ts`, line 17).

**Missing `results_page_token` on render route**
If a submission was inserted without a `results_page_token` (should not happen given current insert logic, but possible via direct DB manipulation), `sendResultsEmail` would construct a broken URL. No guard exists for this specifically — it would surface as a broken link in the email.

**Client email failure is non-fatal**
If the client confirmation email fails after the designer notification email succeeds, the failure is logged but the route still returns 200 (`app/api/submit/route.ts`, lines 396–407). The submission and designer email are already sent. This is intentional to avoid leaving the user on an error screen when the core flow succeeded.

---

## Things tried that didn't work

**fal.ai as the image generation provider**
Attempted and abandoned. The `subscribe()` API returned a wrapped response where the image URLs were nested under `.data`, which was not documented clearly. After unwrapping `.data` the response parsing still failed intermittently. Multiple debugging commits were required (`6ebd8e4`, `6330d60`, `b437e87`) before the decision was made to switch to Replicate entirely (`a5cd7d3`). Replicate's `run()` API is more straightforward despite its inconsistent output shape.

**Setting `maxDuration` higher than 60 on the render route**
Attempted during early development. Vercel Hobby plan enforces a 60-second hard limit regardless of what `maxDuration` is set to. Commit `14d03fc` documents the explicit reduction. Do not attempt to raise this value — it will not work on Hobby and will silently fall back to 60.

---

## Environment & deployment gotchas

**`NEXT_PUBLIC_DESIGNER_SLUG` vs `DESIGNER_SLUG`**
The CLAUDE.md env var list shows `DESIGNER_SLUG`, but the code references `process.env.NEXT_PUBLIC_DESIGNER_SLUG` in both `app/api/submit/route.ts` and `app/api/dashboard-data/route.ts`. The `NEXT_PUBLIC_` prefix makes it available client-side. Ensure the env var is named `NEXT_PUBLIC_DESIGNER_SLUG` in Vercel's project settings, not just `DESIGNER_SLUG`.

**`SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`**
Server-side routes use `process.env.SUPABASE_URL` (without `NEXT_PUBLIC_`), while the CLAUDE.md schema lists `NEXT_PUBLIC_SUPABASE_URL`. Verify which name is actually set in your Vercel environment — the server routes will silently fail config checks if the name is wrong.

**Cron job requires Vercel deployment — local dev cannot test it**
The Vercel Cron defined in `vercel.json` only runs in deployed environments. To test the digest locally, call `/api/cron/digest` directly with a `Authorization: Bearer <CRON_SECRET>` header.

**`next.config.mjs` whitelists `replicate.delivery` for `next/image`**
The `remotePatterns` in `next.config.mjs` allows images from `replicate.delivery`. The results page uses plain `<img>` tags (not `next/image`) to avoid this needing to be configured, but the whitelist exists and would be needed if the render display is ever migrated to `next/image`.

**`onboarding@resend.dev` as sender on all outbound email**
Until a custom domain is verified in Resend, all email comes from this address regardless of the `from` display name set in code. Email clients may show the true sender address to recipients, which breaks the white-label illusion for designers. This is a known limitation of the free tier.

**No RLS on Supabase tables**
All database access goes through the service role key (which bypasses Row Level Security). There are no RLS policies. This is acceptable while access is entirely server-side via API routes, but would need to change if any client-side Supabase calls are ever introduced.

---

## Design decisions locked in

**Photos are mandatory (not optional)**
As of the ControlNet upgrade, at least one photo is required on the intake form. ControlNet depth needs the client's actual room photo as `image` input to preserve geometry. The validation exists on both the client (`photos.length === 0` check in `validate()`) and the server (`photoUrls.length === 0` returns 400). Any code path that assumed photos were optional has been removed.

**ControlNet depth chosen over FLUX img2img**
ControlNet depth was selected over FLUX img2img for two reasons: (1) ControlNet explicitly extracts a depth map from the input image, preserving structural geometry (wall angles, window positions, ceiling height) while allowing full style transfer; (2) `jagilley/controlnet-depth` on Replicate has a stable, well-documented API. FLUX img2img with ControlNet conditioning was considered but would have required a custom ComfyUI workflow.

**Portfolio images stored even though only used for Vision**
The scrape-portfolio route downloads and uploads portfolio images to Supabase Storage (`designer-portfolios` bucket) before passing them to Claude Vision. Even though Vision only needs the base64 data, storing the images enables future features: showing the designer's portfolio in the dashboard, re-running Vision without re-scraping, or using the images for other ML tasks.

**"Obsidian & Champagne" color palette**
The full palette is defined in CLAUDE.md. It is embedded throughout `IntakeForm.tsx`, `app/globals.css`, and all email templates as inline hex values — there is no central CSS variable or theme token system. Any color change requires finding and replacing values across multiple files. Do not introduce new colors.

**2px border-radius everywhere**
All interactive elements, cards, images, and buttons use `borderRadius: 2`. This is a deliberate architectural sharpness to match the luxury aesthetic. Do not round anything further.

**Phase discipline — renders are always async**
The intake form always returns success before renders are complete. This is not a performance optimization that can be toggled — it is a structural requirement given the 60-second function limit. Any feature that tries to return render URLs synchronously from the submit flow will hit the timeout.

**Token-gated results page**
Results are accessed via a UUID token generated at submission time and stored in `results_page_token`. There is no login, no account, and no way to look up results without the token. This keeps the client experience frictionless. The token is sent to the client via email — if the email fails, the client has no way to access their results.

**Watermark removed — product is now fully paid**
The freemium model and `Watermark` component were removed in Phase 4. DesignLead is now a fully paid product with Base and Pro tiers. The `is_paid` column remains in the `designers` table for future repurposing as `plan_tier` (base vs pro). The `Watermark` React component and all `is_paid` conditional rendering have been deleted from `app/results/[token]/page.tsx` and `app/api/results-data/route.ts`. Do not re-introduce watermark logic.

**AI-drafted response emails — mailto: approach chosen over direct sending**
Phase 4 adds an AI-drafted response email per submission, surfaced in the dashboard via a "Draft response" modal. The designer sends it via a `mailto:` link that opens their default email client with subject, recipient, and body pre-filled — they send from their own email address. Direct sending via Resend or Gmail/Outlook OAuth was rejected: `mailto:` requires zero new integrations, keeps the designer's email identity intact, and is upgradable to direct API sending in a later phase. Subject line is hard-coded (no extra API call): Hungarian if `additional_info` matches `/[áéíóöőúüű]/i` or is empty, English otherwise.

**Response email generation runs in parallel with designer notification email**
In `app/api/submit/route.ts`, `generateResponseDraft()` and `resend.emails.send()` (designer email) are called via `Promise.allSettled()`. This saves ~3s per submission. The draft call is non-fatal: if it fails, `ai_response_draft` is stored as null and the dashboard simply omits the "Draft response" button for that submission.

**`response_tone` fallback is 'warm and personal' for existing designers**
The `generateResponseDraft()` function falls back to `'warm and personal'` when `designerProfile.response_tone` is null. Existing designers onboarded before Phase 4 have no `response_tone` set and will silently receive this default. The onboard form now captures this field as a required radio selection for new designers.

**Single-tenant deployment model**
Each designer runs their own Vercel deployment with their own set of environment variables. There is no shared user database, no login system, and no multi-tenant routing. Expanding to multi-tenant would require significant architectural changes and should not be attempted incrementally.
