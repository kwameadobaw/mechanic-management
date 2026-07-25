import { supabase } from "./supabaseClient";
import { generateTrackingCode, stripFormatting } from "./codeGenerator";

// ---------------------------------------------------------------
// Auth (shop admin)
// ---------------------------------------------------------------
export async function signUpShop({ email, password, shopName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { shop_name: shopName } },
  });
  if (error) throw error;
  return data;
}

export async function signInShop({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutShop() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
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
  if (error) throw error;
  return data;
}

export async function searchCustomers(query) {
  if (!query) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function createCustomer({ shopId, name, phone, email }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ shop_id: shopId, name, phone, email })
    .select()
    .single();
  if (error) throw error;
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
  if (error) throw error;
  return data;
}

export async function getVehicle(id) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, customers(name, phone, email)")
    .eq("id", id)
    .single();
  if (error) throw error;
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
    // 23505 = unique_violation; retry with a new code. Anything else, bail.
    if (error.code !== "23505") throw error;
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
  if (error) throw error;
  return data;
}

export async function reopenVehicle(vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ status: "active", repaired_at: null })
    .eq("id", vehicleId)
    .select()
    .single();
  if (error) throw error;
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
  if (error) throw error;
  return data;
}

export async function postUpdate({ vehicleId, message, createdBy }) {
  const { data, error } = await supabase
    .from("updates")
    .insert({ vehicle_id: vehicleId, message, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------
// Owner-facing lookups (no auth — public RPC by tracking code)
// ---------------------------------------------------------------
export async function fetchVehicleByCode(rawCode) {
  const code = stripFormatting(rawCode);
  const { data, error } = await supabase.rpc("get_vehicle_by_code", { p_code: code });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchUpdatesByCode(rawCode) {
  const code = stripFormatting(rawCode);
  const { data, error } = await supabase.rpc("get_updates_by_code", { p_code: code });
  if (error) throw error;
  return data ?? [];
}
