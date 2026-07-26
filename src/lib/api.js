import { supabase } from "./supabaseClient";
import { generateTrackingCode, stripFormatting } from "./codeGenerator";

// ---------------------------------------------------------------
// Error handling: never let raw Postgres/PostgREST error text reach
// the UI. Internals like constraint names, table/column names, or
// "row-level security" wording are useful to an attacker probing the
// schema and meaningless to a shop owner. Map known, safe cases to
// plain language and fall back to a generic message for everything
// else.
// ---------------------------------------------------------------
function friendlyMessage(error, fallback = "Something went wrong. Please try again.") {
  const message = error?.message || "";

  if (/already registered/i.test(message)) return "An account with that email already exists.";
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email before logging in.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a moment and try again.";
  if (error?.code === "23505" || /duplicate key/i.test(message)) return "That record already exists.";
  if (/password/i.test(message)) return message; // Supabase's own password-policy messages are safe to show as-is.

  // Anything that looks like it's leaking schema/internals gets swapped
  // for the generic fallback instead of being shown to the user.
  if (
    error?.code ||
    /relation|column|constraint|permission denied|row-level security|policy/i.test(message)
  ) {
    return fallback;
  }

  return message || fallback;
}

function throwFriendly(error, fallback) {
  if (!error) return;
  const wrapped = new Error(friendlyMessage(error, fallback));
  wrapped.cause = error;
  throw wrapped;
}

// ---------------------------------------------------------------
// Auth (shop admin)
// ---------------------------------------------------------------
export async function signUpShop({ email, password, shopName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { shop_name: shopName } },
  });
  throwFriendly(error);
  return data;
}

export async function signInShop({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  throwFriendly(error);
  return data;
}

export async function signOutShop() {
  const { error } = await supabase.auth.signOut();
  throwFriendly(error);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  throwFriendly(error);
  return data.session;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  throwFriendly(error);
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  throwFriendly(error);
  return data;
}

// ---------------------------------------------------------------
// Shop profile (stored in the public `shops` table, not just auth
// metadata, so it's visible and manageable directly in Supabase's
// table editor)
// ---------------------------------------------------------------
export async function getShopProfile(shopId) {
  const { data, error } = await supabase.from("shops").select("*").eq("id", shopId).single();
  throwFriendly(error);
  return data;
}

export async function updateShopProfile({ shopId, name, phone, address }) {
  const { data, error } = await supabase
    .from("shops")
    .update({ name, phone, address })
    .eq("id", shopId)
    .select()
    .single();
  throwFriendly(error);
  return data;
}

// ---------------------------------------------------------------
// Customers (admin-only, scoped by RLS to the logged-in shop)
// ---------------------------------------------------------------
export async function findCustomerByPhone(phone) {
  if (!phone) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  throwFriendly(error);
  return data;
}

// Strips characters that are meaningful to PostgREST's filter syntax
// (commas separate OR conditions, parentheses group them) so a typed
// search term can't be used to tack on extra filter clauses, and
// escapes SQL LIKE wildcards so `%`/`_` match literally rather than
// as wildcards.
function sanitizeSearchTerm(term) {
  return term
    .replace(/[,()]/g, "")
    .replace(/[%_]/g, "\\$&")
    .slice(0, 100);
}

export async function searchCustomers(query) {
  if (!query) return [];
  const safe = sanitizeSearchTerm(query);
  if (!safe) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  throwFriendly(error);
  return data;
}

export async function createCustomer({ shopId, name, phone, email }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ shop_id: shopId, name, phone, email })
    .select()
    .single();
  throwFriendly(error);
  return data;
}

// ---------------------------------------------------------------
// Vehicles (admin-only)
// ---------------------------------------------------------------
export async function listVehicles({ status } = {}) {
  let query = supabase
    .from("vehicles")
    .select("*, customers(name, phone, email)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  throwFriendly(error);
  return data;
}

export async function getVehicle(id) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, customers(name, phone, email)")
    .eq("id", id)
    .single();
  throwFriendly(error);
  return data;
}

// Inserts a vehicle with a freshly generated code, retrying a
// handful of times in the astronomically unlikely event of a
// collision with an existing code (unique constraint in the DB).
export async function createVehicle({ shopId, customerId, make, model, year, plateNumber, color, notes }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateTrackingCode();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        make,
        model,
        year,
        plate_number: plateNumber,
        color,
        notes,
        access_code: code,
      })
      .select()
      .single();

    if (!error) return data;
    // 23505 = unique_violation on access_code; retry with a new code.
    if (error.code !== "23505") throwFriendly(error);
  }
  throw new Error("Could not generate a unique tracking code. Please try again.");
}

export async function markVehicleRepaired(vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ status: "repaired", repaired_at: new Date().toISOString() })
    .eq("id", vehicleId)
    .select()
    .single();
  throwFriendly(error);
  return data;
}

export async function reopenVehicle(vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ status: "active", repaired_at: null })
    .eq("id", vehicleId)
    .select()
    .single();
  throwFriendly(error);
  return data;
}

// ---------------------------------------------------------------
// Updates (admin posts, admin reads via vehicle_id)
// ---------------------------------------------------------------
export async function listUpdatesForVehicle(vehicleId) {
  const { data, error } = await supabase
    .from("updates")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });
  throwFriendly(error);
  return data;
}

export async function postUpdate({ vehicleId, message, createdBy }) {
  const { data, error } = await supabase
    .from("updates")
    // created_by also defaults to auth.uid() at the database level
    // (see schema_v3_security.sql) — passing it here too keeps this
    // working the same way before and after that migration is applied.
    .insert({ vehicle_id: vehicleId, message, created_by: createdBy })
    .select()
    .single();
  throwFriendly(error);
  return data;
}

// ---------------------------------------------------------------
// Owner-facing lookups (no auth — public RPC by tracking code)
// ---------------------------------------------------------------
export async function fetchVehicleByCode(rawCode) {
  const code = stripFormatting(rawCode);
  const { data, error } = await supabase.rpc("get_vehicle_by_code", { p_code: code });
  throwFriendly(error, "Couldn't look that up right now. Please try again.");
  return data?.[0] ?? null;
}

export async function fetchUpdatesByCode(rawCode) {
  const code = stripFormatting(rawCode);
  const { data, error } = await supabase.rpc("get_updates_by_code", { p_code: code });
  throwFriendly(error, "Couldn't look that up right now. Please try again.");
  return data ?? [];
}
