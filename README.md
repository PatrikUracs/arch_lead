# DesignLead — Client Intake & Concept Platform

An end-to-end client intake system for interior designers. Clients fill out a project inquiry with room photos → AI generates a structured brief → the designer receives it by email → AI renders 3 concept images in the background → the client receives a link to their personalised results page.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Groq (Llama 3.3-70b) · Anthropic Claude Vision · fal.ai (Flux Schnell) · Supabase · Resend · Vercel

---

## Phase overview

| Phase | What it does |
|---|---|
| 1 | Client intake form · Groq brief · emails to designer + client |
| 2 | Photo upload · Claude Vision room analysis · designer style profile via `/onboard` |
| 3 | AI concept renders (fal.ai) · results page · designer dashboard · daily digest cron |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values (see full template at the bottom of this README).

### 3. Run the Supabase SQL

In your Supabase project → SQL editor, run the following:

```sql
-- Designer profiles
create table if not exists designers (
  slug text primary key,
  name text not null,
  studio_name text,
  portfolio_url text,
  style_keywords text[],
  typical_project_size text,
  rate_per_sqm text,
  bio text,
  calendly_url text,
  is_paid boolean default false,
  notification_preference text default 'instant'
);

-- Client submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  designer_slug text not null,
  client_name text not null,
  client_email text not null,
  room_type text not null,
  room_size text not null,
  design_style text not null,
  budget_range text not null,
  timeline text not null,
  additional_info text,
  photo_urls text[],
  brief text,
  lead_quality text,
  render_urls text[],
  render_status text default 'pending',
  results_page_token text,
  status text default 'New'
);

-- Storage bucket for room photos
insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', false)
on conflict do nothing;
```

If the `designers` table already exists (from Phase 2), run only the new columns:

```sql
alter table designers add column if not exists calendly_url text;
alter table designers add column if not exists is_paid boolean default false;
alter table designers add column if not exists notification_preference text default 'instant';
alter table designers add column if not exists studio_name text;
```

### 4. Set up the designer profile

Visit `/onboard?key=YOUR_ONBOARD_SECRET` and fill out the form. This creates the designer row in Supabase that personalises every brief and results page.

---

## Get API keys

### Groq (free)
1. Go to [console.groq.com](https://console.groq.com) and sign in
2. API Keys → Create API Key
3. Paste as `GROQ_API_KEY`

### Resend (free tier: 3,000 emails/month)
1. Go to [resend.com](https://resend.com) and sign up
2. API Keys → Create API Key
3. Paste as `RESEND_API_KEY`

### Anthropic (Claude Vision)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Paste as `ANTHROPIC_API_KEY`

### fal.ai (pay-as-you-go, ~$0.003/image)
1. Go to [fal.ai](https://fal.ai) and sign up
2. Billing → Add credits (minimum $5 top-up — no subscription required)
3. API Keys → Create key
4. Paste as `FAL_API_KEY`

Each form submission generates 3 images → ~$0.009 per submission. $5 covers ~555 submissions.

### Supabase (free tier)
1. Go to [supabase.com](https://supabase.com) and create a project
2. Settings → API → copy `Project URL`, `anon key`, and `service_role key`

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Add all environment variables in Vercel → Settings → Environment Variables. Make sure to include `CRON_SECRET`.

Vercel automatically picks up `vercel.json` and registers the daily digest cron job.

### Configure the Vercel cron job

The digest cron runs at 8:00 AM UTC every day. To activate it:

1. Deploy the app to Vercel
2. In Vercel → Settings → Environment Variables, add `CRON_SECRET` (any long random string)
3. Vercel automatically sends `Authorization: Bearer [CRON_SECRET]` when invoking the cron endpoint
4. The cron only sends emails to designers with `notification_preference = 'digest'`

To test the cron manually:
```bash
curl -X GET https://yourapp.vercel.app/api/cron/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Mark a designer as a paying customer

When a designer upgrades, remove the watermark from their results page by running this in Supabase SQL editor:

```sql
update designers set is_paid = true where slug = 'your-designer-slug';
```

To revert:
```sql
update designers set is_paid = false where slug = 'your-designer-slug';
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Client intake form |
| `/onboard?key=SECRET` | Designer profile setup |
| `/results/[token]` | Client results page (renders + brief summary) |
| `/dashboard` | Designer dashboard (password protected) |
| `/api/submit` | Form submission handler |
| `/api/upload` | Photo upload to Supabase Storage |
| `/api/render` | Background fal.ai image generation |
| `/api/results-data` | GET submission + designer data for results page |
| `/api/dashboard-data` | GET all submissions for dashboard |
| `/api/dashboard-auth` | POST password check for dashboard |
| `/api/submissions/[id]/status` | PATCH submission status |
| `/api/designer-settings` | PATCH notification preference |
| `/api/cron/digest` | GET daily digest email (Vercel cron) |
| `/api/onboard` | POST designer profile upsert |

---

## Complete .env.local template

```
# ── Phase 1 ────────────────────────────────────────────────────────
GROQ_API_KEY=
RESEND_API_KEY=
DESIGNER_EMAIL=
DESIGNER_NAME=Patrik Uracs Interior Design

# ── Phase 2 ────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DESIGNER_SLUG=
ONBOARD_SECRET=

# ── Phase 3 ────────────────────────────────────────────────────────
FAL_API_KEY=
NEXT_PUBLIC_APP_URL=        # e.g. https://yourapp.vercel.app
DASHBOARD_PASSWORD=
CRON_SECRET=
```

---

## Going live checklist

Run through these steps in order before sharing the form with a real designer:

1. **Supabase** — create project, run all SQL from the "Getting started" section, confirm `designers` and `submissions` tables exist and `room-photos` bucket is created
2. **Groq** — create API key, paste as `GROQ_API_KEY`, confirm free tier is active
3. **Resend** — create API key, paste as `RESEND_API_KEY`, verify `DESIGNER_EMAIL` is set correctly
4. **Anthropic** — create API key, paste as `ANTHROPIC_API_KEY`
5. **fal.ai** — create account, add $5+ credit, create API key, paste as `FAL_API_KEY`
6. **Environment** — copy `.env.local.example` to `.env.local`, fill every value, double-check `NEXT_PUBLIC_APP_URL` has no trailing slash
7. **Deploy** — run `npx vercel --prod`, add all env vars in Vercel dashboard
8. **Onboard designer** — visit `/onboard?key=YOUR_ONBOARD_SECRET`, fill out profile including style keywords, studio name, and optionally a Calendly URL
9. **Test submission** — submit the form with a real photo, check that: designer email arrives, Supabase `submissions` row is created, render images appear in `render_urls` after ~60s, client results email arrives, `/results/[token]` loads correctly
10. **Dashboard** — visit `/dashboard`, enter `DASHBOARD_PASSWORD`, confirm submissions table loads and status updates work
11. **Cron** — optionally test the digest endpoint manually (see cron section above)
12. **Watermark** — confirm `is_paid = false` (default) shows the watermark overlay on renders. Run the SQL `update` when a designer pays.
13. **Share the URL** — give the designer their form URL (`/`) and dashboard URL (`/dashboard`)
