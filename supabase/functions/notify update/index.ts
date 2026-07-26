// Supabase Edge Function: notify-update
//
// Triggered by a Database Webhook on INSERT into `updates`
// (Dashboard -> Database -> Webhooks -> new webhook, table
// "updates", event "Insert", type "Supabase Edge Functions",
// pick this function).
//
// SECURITY NOTE: deploy this WITHOUT --no-verify-jwt.
//   supabase functions deploy notify-update
// Database Webhooks automatically call the function with a valid
// service-role bearer token, so Supabase's built-in JWT check
// already blocks anonymous callers. On top of that, this function
// also requires a shared secret header (WEBHOOK_SECRET) as a
// second, independent layer of defense -- so even if JWT
// verification is ever accidentally disabled, or the project's
// anon key leaks, this endpoint still can't be triggered by an
// outsider to spam arbitrary emails or probe which vehicles exist.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   WEBHOOK_SECRET     - a random string you generate yourself, e.g.
//                        `openssl rand -hex 32`; put the same value
//                        in the webhook's custom header (see
//                        UPDATES_README.md)
//   RESEND_API_KEY     - your Resend API key
//   NOTIFY_FROM_EMAIL  - a verified sending address, e.g. updates@yourshop.com
//   APP_URL            - your deployed app's base URL, e.g. https://track.yourshop.com
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically in the Edge Function environment.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "updates@example.com";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  // Shared-secret check, independent of JWT verification. Uses a
  // fixed-time comparison so a mismatch can't be timed to guess
  // the secret one character at a time.
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !timingSafeEqual(providedSecret, WEBHOOK_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const record = (payload as any)?.record ?? payload; // supports webhook and direct-call shapes
  const vehicleId = record?.vehicle_id;
  const message = record?.message;

  if (typeof vehicleId !== "string" || typeof message !== "string" || message.length === 0) {
    return json({ error: "invalid payload" }, 400);
  }

  if (!RESEND_API_KEY) {
    // Not a caller-facing error -- the shop just hasn't finished setup yet.
    return json({ ok: true, sent: false });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("make, model, customers(name, email)")
      .eq("id", vehicleId)
      .single();

    // Deliberately generic response either way -- this endpoint
    // shouldn't reveal to a caller whether a given id exists.
    if (error || !vehicle || !vehicle.customers?.email) {
      return json({ ok: true, sent: false });
    }

    const trackingUrl = APP_URL ? `${APP_URL.replace(/\/$/, "")}/track` : null;

    const html = `
      <p>Hi ${escapeHtml(vehicle.customers?.name ?? "there")},</p>
      <p>There's a new update on your ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}:</p>
      <blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #ccc;color:#333;">
        ${escapeHtml(message)}
      </blockquote>
      ${trackingUrl ? `<p>Check full progress any time with your code at <a href="${trackingUrl}">${trackingUrl}</a>.</p>` : ""}
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: vehicle.customers.email,
        subject: `Update on your ${vehicle.make} ${vehicle.model}`,
        html,
      }),
    });

    if (!res.ok) {
      // Log detail server-side (visible in `supabase functions logs`)
      // without echoing internals back to the caller.
      console.error("Resend send failed", await res.text());
      return json({ ok: false }, 502);
    }

    return json({ ok: true, sent: true });
  } catch (err) {
    console.error("notify-update error", err);
    return json({ ok: false }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Constant-time string comparison so response timing can't leak
// how many leading characters of the secret a guess got right.
function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}
