# What's new — setup steps

This covers the four updates: password reset, a visible shop-details table,
a redesigned home screen, and email notifications on new updates.

Replace the matching files in your project with the ones from this batch,
then follow the steps below. Nothing here requires re-doing your original
`supabase/schema.sql` — it's additive.

## 1. Forgot-password + strong password requirements

**Code:** `AdminLogin.jsx` now has a "Forgot password?" link, a new
`ResetPassword.jsx` page, and a live checklist (`PasswordRequirements.jsx` /
`passwordPolicy.js`) enforced on both signup and reset. Requirements: 10+
characters, upper + lower case, a number, and a special character.

**One thing to set up in Supabase:**
Go to **Authentication → URL Configuration** in your dashboard and add your
app's reset URL to **Redirect URLs**:
- `http://localhost:5173/admin/reset-password` for local dev
- `https://your-deployed-domain.com/admin/reset-password` for production

Without this, Supabase will reject the redirect and the emailed link won't
land on the right page.

Optional but recommended: in **Authentication → Providers → Email**, raise
Supabase's own minimum password length to match (10) as a second line of
defense — the app already enforces this client-side either way.

## 2. Shop details visible in Supabase

**Run this migration:** open the SQL editor and run
`supabase/schema_v2.sql`. It adds a `shops` table (name, email, phone,
address) that you can browse and edit directly in the Supabase **Table
Editor**, plus a trigger that auto-creates a shop's row the moment they sign
up, and backfills a row for any shop accounts you already created.

**Code:** a new **Shop settings** page (linked from the navbar once logged
in) lets the shop edit their phone/address themselves; name and login email
show there too.

## 3. Home screen refresh

Purely front-end — `Landing.jsx` now has hero/gallery photography and
staggered fade-in animation, `index.css` has the new styles. No Supabase
changes needed. Images are hotlinked from Pexels (free-to-use stock
photography); swap the URLs in `Landing.jsx` for your own shop's photos
whenever you'd like.

## 4. Email the owner when an update is posted

This one needs a mail-sending account since Supabase doesn't send arbitrary
emails on its own. The included function uses **Resend**
(resend.com — has a free tier), but you can swap the `fetch` call in the
function for any provider.

**Steps:**

1. **Create a Resend account**, verify a sending domain (or use their
   sandbox domain for testing), and grab an API key.

2. **Generate a shared secret** for the function to check against
   (this stops anyone who finds the function's URL from calling it
   directly to spam owners or probe which vehicle IDs exist):
   ```bash
   openssl rand -hex 32
   ```
   Keep the output — you'll use it in steps 3 and 4.

3. **Deploy the edge function** (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)).
   Do **not** add `--no-verify-jwt` — leaving JWT verification on means
   Supabase itself rejects any caller that doesn't present a valid
   service-role token, which Database Webhooks provide automatically:
   ```bash
   supabase functions deploy notify-update
   ```

4. **Set secrets** for the function:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set NOTIFY_FROM_EMAIL=updates@yourshop.com
   supabase secrets set APP_URL=https://your-deployed-domain.com
   supabase secrets set WEBHOOK_SECRET=the-value-from-step-2
   ```

5. **Wire it up to new updates** — in the Supabase dashboard go to
   **Database → Webhooks → Create a new webhook**:
   - Table: `updates`
   - Events: `Insert`
   - Type: `Supabase Edge Functions`
   - Function: `notify-update`
   - Under **HTTP Headers**, add: `x-webhook-secret: the-value-from-step-2`

   Supabase handles the service-role authentication automatically; the
   header above is the second, independent check the function itself
   verifies.

6. **Test it:** post an update from the shop dashboard on a vehicle whose
   owner has an email on file. If the owner has no email, the function
   simply skips sending (nothing breaks). Check `supabase functions logs
   notify-update` if an email doesn't arrive.

If you'd rather not use a webhook, the function also accepts a direct call
with `{ vehicle_id, message }` in the body and the same `x-webhook-secret`
header, so you could call it straight from `postUpdate()` in
`src/lib/api.js` using `supabase.functions.invoke()` instead — trade-off is
the app then waits on the email send before the update finishes posting,
which the webhook approach avoids.
