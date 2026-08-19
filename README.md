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

## 6. Roadmap (next build stages)

- **Day 2:** Claude-powered lead scoring & categorization, follow-up sequences, lead activity timeline UI, template editor UI, bulk lead actions
- **Day 3:** Full CRM UI (drag-and-drop pipeline), customers, orders, invoices, payments, projects + tasks, team management, commission calculation
- **Day 4:** Full analytics suite, notifications, calendar, global search, audit log viewer, AI Business Assistant chat, responsive polish, final security pass

---

## Notes on data integrity

Per the blueprint's core rule: **the system never fabricates emails, phone numbers, businesses, or revenue figures.** Anything not verifiably found is stored as `null` in the database and rendered as "Not Found" in the UI — this is enforced in `server/src/lib/lead-discovery.ts` and should stay enforced in any code added later.
