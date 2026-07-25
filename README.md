# Torque & Track — Mechanic Repair Tracking System

A small web app for auto repair shops. The shop logs each vehicle once,
generates a 16-character tracking code for the owner, and posts progress
updates. The owner checks status any time using only that code — no
account required.

## How it works

- **Shop owner (admin)** creates an account and logs in with email/password
  (Supabase Auth).
- On intake, the shop looks up the owner by phone number first. If the owner
  already exists (a returning customer), their contact details are reused —
  nothing is re-entered. Only a new vehicle/case record is created, so
  customer data is never duplicated.
- Creating a vehicle generates a random 16-character alphanumeric tracking
  code (ambiguous characters like `0/O` and `1/I/L` are excluded to avoid
  transcription mistakes) and shows it as a ticket the shop hands to the
  owner.
- The shop posts free-text progress updates against the vehicle at any time.
- The **car owner** visits `/track`, enters their code, and sees the
  vehicle's status and full update timeline. No login, no account.
- When the repair is done, the shop marks the vehicle **repaired**. If the
  same owner comes back later, the shop opens "start new case for this
  owner" from the old vehicle page, which pre-fills the owner's details and
  only asks for the new vehicle's info — a fresh case with a fresh code,
  same customer record.

## Tech stack

- React + Vite (frontend)
- React Router (routing)
- Supabase (Postgres database, Auth, and Row Level Security)

## Project structure

```
mechanic-management/
├── supabase/
│   └── schema.sql          # tables, RLS policies, RPC functions
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   ├── codeGenerator.js # 16-char code generation/formatting
│   │   └── api.js           # all Supabase reads/writes used by the app
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── StatusBadge.jsx
│   │   └── CodeTicket.jsx
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── AdminLogin.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── NewVehicle.jsx
│   │   ├── VehicleDetail.jsx
│   │   └── TrackVehicle.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, and wait
for it to finish provisioning.

### 2. Run the schema

Open **SQL Editor** in your Supabase dashboard, paste the contents of
`supabase/schema.sql`, and run it. This creates:

- `customers`, `vehicles`, `updates` tables
- Row Level Security policies so a shop can only ever see its own data
- Two `SECURITY DEFINER` RPC functions (`get_vehicle_by_code`,
  `get_updates_by_code`) that let an anonymous visitor look up **one**
  vehicle by its exact tracking code, without ever exposing the rest of the
  table to the public.

### 3. Get your API keys

In **Project Settings → API**, copy the **Project URL** and the **anon
public key**.

### 4. Configure the app

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 5. Install and run

```bash
npm install
npm run dev
```

Visit the printed local URL. Create a shop account at `/admin/login`, then
receive a vehicle from the dashboard.

### 6. (Optional) Email confirmation

By default, Supabase Auth requires email confirmation for new sign-ups. For
local testing you can turn this off in **Authentication → Providers → Email
→ Confirm email**, or just confirm the account from the Supabase dashboard's
**Authentication → Users** page.

## Notes on the tracking code

- 16 characters, uppercase letters and digits, generated with
  `crypto.getRandomValues` (see `src/lib/codeGenerator.js`).
- Enforced unique at the database level (`vehicles.access_code unique`); the
  app retries generation on the rare collision.
- Displayed to the shop and typed in by the owner in groups of four
  (`AB3D-EF7H-JK2M-NPQR`) for readability — stored and looked up without the
  dashes.

## Deploying

Any static host works since this is a Vite SPA (Vercel, Netlify, Cloudflare
Pages, etc.). Set the two `VITE_SUPABASE_*` environment variables in your
host's dashboard and use `npm run build` as the build command with `dist` as
the output directory.
