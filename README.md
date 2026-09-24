# Bro's Code — Ops Platform

AI Lead Generation + CRM + Sales + Project Management, built for Bro's Code.

**Stack:** Next.js 14 (TypeScript, Tailwind) · Express + TypeScript · PostgreSQL + Prisma ·
JWT auth with role-based access · Google Places API (real lead data) · Resend (email) ·
Claude API (AI scoring/assistant) · deployed on Vercel.

```
broscode-platform/
├── client/     Next.js admin dashboard
└── server/     Express API + Prisma
```

---

## 1. Prerequisites

- Node.js 18+ and npm
- A free PostgreSQL database — easiest is **Vercel Postgres** (or Neon, Supabase, Railway)
- A free **Google Cloud** account for lead discovery (Places API)
- A free **Resend** account for sending email
- An **Anthropic** API key for AI scoring / categorization / the AI assistant

---

## 2. Get your API keys (5 minutes)

**Database (Vercel Postgres):**
1. vercel.com → your account → Storage → Create Database → Postgres
2. Copy the `DATABASE_URL` shown under the `.env.local` tab

**Google Places API (free lead data):**
1. console.cloud.google.com → create a project
2. APIs & Services → Library → enable **"Places API (New)"**
3. APIs & Services → Credentials → Create API Key
4. (Billing account required, but Google gives $200/month free credit — plenty for MVP use)

**Resend (email sending):**
1. resend.com → sign up → API Keys → Create API Key
2. Add and verify your sending domain under Domains (or use their test domain while developing)

**Anthropic (AI features):**
1. console.anthropic.com → API Keys → Create Key

---

## 3. Local setup — run these commands

```bash
# clone / unzip the project, then from the root:
cd broscode-platform

# ---- SERVER ----
cd server
npm install
cp .env.example .env
# now open .env and paste in DATABASE_URL, JWT_SECRET, GOOGLE_PLACES_API_KEY, RESEND_API_KEY, ANTHROPIC_API_KEY

npx prisma generate
npx prisma migrate dev --name init
npm run seed          # creates default categories + a sample email template

npm run dev           # API running at http://localhost:4000
```

Open a **second terminal**:

```bash
# ---- CLIENT ----
cd broscode-platform/client
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL already points at http://localhost:4000/api — leave as is for local dev

npm run dev            # app running at http://localhost:3000
```

Visit **http://localhost:3000** → you'll land on `/login`.
Click **"Create one"** to register — the **first account you create automatically becomes Super Admin**.
After that, self-registration is closed (as per the blueprint's role model); the Super Admin adds teammates from Settings → Users.

---

## 4. Deploy — both on Vercel

**Deploy the server first** (so you have its live URL for the client):

```bash
cd broscode-platform/server
npx vercel login
npx vercel                 # first deploy — link/create a new Vercel project
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
npx vercel env add GOOGLE_PLACES_API_KEY production
npx vercel env add RESEND_API_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add CLIENT_URL production   # your client's future Vercel URL, e.g. https://broscode-app.vercel.app
npx vercel --prod
```

Copy the production URL Vercel gives you (e.g. `https://broscode-api.vercel.app`).

**Then deploy the client:**

```bash
cd broscode-platform/client
npx vercel login
npx vercel
npx vercel env add NEXT_PUBLIC_API_URL production   # paste: https://broscode-api.vercel.app/api
npx vercel --prod
```

Run the Prisma migration against your production database once:

```bash
cd broscode-platform/server
npx prisma migrate deploy
npm run seed
```

Your platform is live. Open the client's production URL and register the Super Admin account.

---

## 5. What's built so far (Day 1 — Foundation)

- Full auth system: JWT + bcrypt, role-based access control (Super Admin / Admin / Manager / Sales / Developer / Designer / Marketer)
- Complete database schema — all 29 tables from the blueprint (leads, categories, email templates + version history, CRM, deals, orders, invoices, payments, projects, tasks, team, commissions, expenses, notifications, audit logs)
- **AI Lead Finder** — real business discovery via Google Places API, with best-effort website email enrichment. Nothing is ever invented: unverified fields are stored as `null` and shown as **"Not Found"**
- Auto-categorization + lead scoring (Hot/Warm/Cold)
- Category-based email templates with version history, and **one-click send** via Resend with full logging
- Admin dashboard UI — dark/light mode, all 16 KPI cards, revenue + pipeline charts, recent leads table
- Sidebar/topbar shell with placeholders for every module so nothing 404s while the rest is built

## 5b. AI Cold Calling (new)

The AI agent picks up leads that have a phone number, places a real outbound call, and has a live spoken conversation — no human on the line. Interested leads are auto-tagged in the CRM (status → `INTERESTED`) with the call summary logged on the lead's timeline.

**How it works (no extra paid AI voice services needed — keeps cost to just the phone call itself):**
- **Telephony + Speech-to-Text + Text-to-Speech**: all handled by Twilio's built-in `<Gather input="speech">` and `<Say>` — no separate STT/TTS bill.
- **The conversation brain**: Groq (already used elsewhere in this app) — free tier, fast enough for a live call.
- **Data**: every turn is saved to the `Call` model; when the call ends, Twilio's status webhook triggers an AI summary and updates the lead.

**Setup (free to start):**
1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio) — no credit card needed for the trial, you get ~$15 free credit and one free phone number.
2. Console → copy your **Account SID** and **Auth Token** into `server/.env`.
3. Console → Phone Numbers → your trial number → paste it into `TWILIO_PHONE_NUMBER` (E.164 format, e.g. `+1415XXXXXXX`).
4. Twilio needs a public URL to send call webhooks to:
   - **Local dev**: install [ngrok](https://ngrok.com), run `ngrok http 4000`, paste the `https://...ngrok-free.app` URL into `SERVER_PUBLIC_URL`.
   - **Production**: use your deployed API's Vercel URL.
5. Get a free `GROQ_API_KEY` at [console.groq.com](https://console.groq.com) if you haven't already.
6. **Trial account limitation**: Twilio trial accounts can only call numbers you've manually verified in the Console (Phone Numbers → Verified Caller IDs) — fine for testing your own number, but real leads' numbers won't connect until you add a payment method (pay-as-you-go, no monthly fee — you only pay per minute + ~$1/month for the number).
7. Calling Pakistani mobile numbers costs more per minute than US/local numbers on Twilio — check current rates at [twilio.com/en-us/pricing](https://www.twilio.com/en-us/pricing) before running a real campaign, since there's no genuinely free way to place real phone calls at volume.

Open **Cold Calling** in the sidebar, tick leads with a phone number, hit **Call Leads**. Run `npx prisma generate && npx prisma db push` once first to sync the new `Call` model to your database.

## 5c. AI Cold Email (new)

Parallel to cold calling, but for email: pick leads with an email on file, AI writes a genuinely personalized email per lead (references their business type, city, and whether they already have a website — never invents facts it wasn't given), sends it, and automatically schedules two follow-ups (day 3, day 7) that only go out if the lead's status hasn't moved forward.

**Setup:**
1. Uses the same `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` as the existing one-click template emails — see section 2 above.
2. Add at least one connected row in **Settings → Email Accounts** (the sender name/email shown on outgoing mail).
3. `GROQ_API_KEY` (same free key used by Cold Calling).
4. **Follow-ups need a daily trigger.** `server/vercel.json` now has a Vercel Cron entry (`0 9 * * *`, once a day) that hits `/api/cold-email/follow-ups/run`. Set a `CRON_SECRET` in both `server/.env` and your Vercel project's Environment Variables (any random string — `openssl rand -hex 32`) so that endpoint can't be triggered by anyone else. Vercel Hobby plans only run daily crons, which is exactly what this needs.
5. If you're not on Vercel (or want to test locally), you can trigger it manually any time: `curl -X POST https://<your-api>/api/cold-email/follow-ups/run -H "Authorization: Bearer <CRON_SECRET>"`.

Open **Cold Email** in the sidebar, tick leads with an email, hit **Email Leads**.

## 6. Roadmap (next build stages)

- **Day 2:** Claude-powered lead scoring & categorization, follow-up sequences, lead activity timeline UI, template editor UI, bulk lead actions
- **Day 3:** Full CRM UI (drag-and-drop pipeline), customers, orders, invoices, payments, projects + tasks, team management, commission calculation
- **Day 4:** Full analytics suite, notifications, calendar, global search, audit log viewer, AI Business Assistant chat, responsive polish, final security pass

---

## Notes on data integrity

Per the blueprint's core rule: **the system never fabricates emails, phone numbers, businesses, or revenue figures.** Anything not verifiably found is stored as `null` in the database and rendered as "Not Found" in the UI — this is enforced in `server/src/lib/lead-discovery.ts` and should stay enforced in any code added later.
