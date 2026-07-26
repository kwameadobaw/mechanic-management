# Security review — findings & fixes

Scope: the full application (React/Vite frontend, Supabase schema/RLS/RPCs,
the notify-update edge function) as it stood before this pass. Everything
marked **Fixed** is included in the files from this batch. Everything marked
**Recommended** needs a manual step in the Supabase or hosting dashboard —
nothing in code can enforce these.

---

## High

**1. Edge function was one flag away from being callable by anyone on the internet.**
The original setup instructions said to deploy `notify-update` with
`--no-verify-jwt`, which disables Supabase's own auth check on the
function's URL entirely. Anyone who found or guessed the URL could have
POSTed arbitrary `vehicle_id`/`message` pairs to spam real owners' inboxes,
or used the differing responses to probe which vehicle IDs exist in your
database.
**Fixed:** deployment instructions no longer use `--no-verify-jwt` (Database
Webhooks already authenticate with a valid service-role token, which
Supabase's default JWT check accepts). The function additionally requires
its own shared-secret header (`x-webhook-secret`, checked with a
constant-time comparison) as a second, independent layer, and responses no
longer reveal whether a given vehicle ID exists.

**2. A shop could link a vehicle to another shop's customer record.**
Row Level Security on `vehicles` only checked that `shop_id = auth.uid()`
on write — it never checked that `customer_id` actually belonged to that
same shop. A vehicle row pointing at someone else's customer ID wouldn't
leak that customer's private details (the *join* to `customers` is still
blocked by that table's own RLS), but it's exactly the kind of
cross-tenant data-integrity gap that tends to get worse over time.
**Fixed:** `schema_v3_security.sql` rewrites the `vehicles` policy so an
insert/update is only allowed when the referenced customer belongs to the
same shop.

**3. Two dependencies had known CVEs.**
`npm audit` flagged `react-router-dom` (open redirect that could lead to
XSS via `<Link>`/`useNavigate`, GHSA-jjmj-jmhj-qwj2) and `esbuild`'s dev
server (any website could send requests to it and read the response,
GHSA-67mh-4wv8-2f99).
**Fixed:** bumped `react-router-dom` 6→7.18.1 and `vite` 5→7.1.5 (which
pulls in a patched `esbuild`). Rebuilt and confirmed the app compiles
clean on both.
**One residual audit flag, judged not applicable:** the latest
`react-router-dom` still trips an advisory about a CSRF bypass in
**Framework Mode / RSC server actions**. This app uses plain Declarative
Mode (`<BrowserRouter>`, no server actions, no RSC), which the advisory
itself explicitly excludes — so there's nothing to exploit here. Downgrading
to dodge the audit flag would reintroduce the open-redirect issue, which
*does* apply to this app, so we stayed on the newer version.

---

## Medium

**4. Database functions were more exposed than intended.**
Postgres grants `EXECUTE` on new functions to `PUBLIC` by default. The two
tracking RPCs relied on `anon`/`authenticated` grants but never explicitly
revoked the broader default.
**Fixed:** `schema_v3_security.sql` revokes from `PUBLIC` and grants only
to `anon`/`authenticated`.

**5. Raw database errors could reach the UI.**
Several places threw Supabase/Postgres errors straight through to the
screen, which can include constraint names, table/column names, or RLS
policy wording — informative to someone probing the schema, meaningless to
a shop owner.
**Fixed:** added `friendlyMessage()` in `api.js`; recognized errors (wrong
password, duplicate account, etc.) show a plain-language message, anything
that looks like schema internals falls back to a generic one.

**6. User input was interpolated directly into a PostgREST filter string.**
`searchCustomers()` built an `.or(...)` filter by dropping the raw search
term into the string. PostgREST's filter syntax treats commas and
parentheses specially, so a crafted search term could distort the intended
filter (row-level security still would have prevented any cross-tenant
data exposure, but it's the wrong pattern to leave in place).
**Fixed:** search terms are now stripped of `,`/`(`/`)` and LIKE wildcards
are escaped before being interpolated.

**7. `updates.created_by` was a plain client-supplied value.**
Nothing stopped the app (or a modified client) from writing an arbitrary
user ID into who "posted" an update.
**Fixed:** the column now defaults to `auth.uid()` at the database level,
and the RLS policy rejects any value other than the caller's own ID.

**8. No server-side validation of tracking-code format.**
The two public RPCs would run a full lookup against whatever string was
handed in, valid-looking or not.
**Fixed:** both RPCs now reject anything that isn't exactly 16
letters/digits before touching the table.

---

## Low

**9. No size limits on free-text fields.**
Vehicle notes, update messages, and customer names had no length cap
client- or server-side.
**Fixed:** added `CHECK` constraints in the database (defense-in-depth,
since API calls can always bypass the UI) and matching `maxLength`
attributes on the relevant form fields, plus basic email-format checks on
`customers.email` / `shops.email`.

**10. No friction on the public code-lookup page.**
Because tracking codes are the only "credential" an owner has, and the
character set/length make brute-forcing computationally infeasible, this
was always low risk — but there was zero cost to a script trying codes
back-to-back.
**Partially mitigated:** added a short client-side cooldown after a failed
lookup. This is a speed bump, not real protection — see the recommendation
below for the durable fix.

---

## Recommended (needs a manual step, can't be fixed from code)

- **Enable Supabase Auth's built-in Attack Protection** (Authentication →
  Attack Protection): leaked-password checking and CAPTCHA on sign-up/
  sign-in. This is the real fix for credential-stuffing and scripted
  sign-up abuse — no amount of client-side validation replaces it.
- **Rate-limit the public endpoints from outside the database.** Postgres
  RLS and the 16-character code keyspace make brute-forcing impractical,
  but there's currently nothing throttling *request volume* itself. Put
  the project behind Cloudflare (or similar) or use Supabase's project-
  level rate limiting so a scripted flood of requests gets throttled
  before it reaches Postgres at all.
- **Turn on Point-in-Time Recovery / regular backups** for the project
  (Database → Backups) if you haven't already — this is unrelated to any
  finding above, just good baseline hygiene for anything holding customer
  contact data.
- **Re-run `npm audit`** periodically (or turn on Dependabot/GitHub's
  security alerts on the repo) — this report is a snapshot, not a
  subscription.
- Keep `WEBHOOK_SECRET`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
  out of version control the same way you already treat `.env` — they're
  set as Supabase function secrets, never shipped to the browser.

---

## What was checked and found clean

- No use of `dangerouslySetInnerHTML` anywhere in the React app — all
  user-generated text (update messages, notes, names) goes through JSX's
  normal escaping, so stored-XSS via those fields isn't possible in the
  current UI.
- The edge function builds its email HTML from user data (name, make,
  model, message) — all of it is HTML-escaped before being interpolated.
- Auth tokens are handled entirely by `supabase-js` (Bearer tokens, not
  cookies), so this isn't susceptible to classic cookie-based CSRF.
- The service-role key is only ever referenced inside the edge function
  (server-side, via `Deno.env`) — never in any file shipped to the browser.
- Password-reset requests return the same message whether or not the
  email exists, avoiding account enumeration.
