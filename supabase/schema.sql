-- ============================================================
-- Mechanic Management System — Supabase schema
-- Run this once in the Supabase SQL editor for your project.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- CUSTOMERS
-- One row per car owner per shop. Vehicles reference this table
-- so a returning owner's contact details are never re-entered
-- or duplicated — only a new vehicle (case) is created for them.
-- ------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists customers_shop_id_idx on customers(shop_id);
create index if not exists customers_phone_idx on customers(shop_id, phone);

-- ------------------------------------------------------------
-- VEHICLES
-- One row per repair case. A given customer can have many rows
-- over time (one per visit), but their info lives once in
-- `customers`. access_code is the 16-char code given to the
-- owner to track this specific case.
-- ------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  make text not null,
  model text not null,
  year text,
  plate_number text,
  color text,
  notes text,
  access_code text not null unique,
  status text not null default 'active' check (status in ('active', 'repaired')),
  created_at timestamptz not null default now(),
  repaired_at timestamptz
);

create index if not exists vehicles_shop_id_idx on vehicles(shop_id);
create index if not exists vehicles_access_code_idx on vehicles(access_code);
create index if not exists vehicles_customer_id_idx on vehicles(customer_id);

-- ------------------------------------------------------------
-- UPDATES
-- Progress log entries the shop posts against a vehicle.
-- ------------------------------------------------------------
create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists updates_vehicle_id_idx on updates(vehicle_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Shop staff (Supabase Auth users) can only ever see/manage rows
-- that belong to them (shop_id = auth.uid()). Car owners never
-- authenticate with Supabase Auth at all — they only ever reach
-- their data through the two SECURITY DEFINER functions below,
-- which return one matching row for the exact code they typed.
-- There is no policy that exposes these tables to anon directly.
-- ------------------------------------------------------------
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table updates enable row level security;

create policy "shop manages own customers"
  on customers for all
  using (shop_id = auth.uid())
  with check (shop_id = auth.uid());

create policy "shop manages own vehicles"
  on vehicles for all
  using (shop_id = auth.uid())
  with check (shop_id = auth.uid());

create policy "shop manages updates on own vehicles"
  on updates for all
  using (exists (
    select 1 from vehicles v where v.id = updates.vehicle_id and v.shop_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = updates.vehicle_id and v.shop_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- RPC: fetch a vehicle + owner + shop name by tracking code.
-- Used by the public "Track my vehicle" page (anon key, no login).
-- ------------------------------------------------------------
create or replace function get_vehicle_by_code(p_code text)
returns table (
  vehicle_id uuid,
  make text,
  model text,
  year text,
  plate_number text,
  color text,
  status text,
  created_at timestamptz,
  repaired_at timestamptz,
  customer_name text,
  shop_name text
)
language sql
security definer
set search_path = public
as $$
  select
    v.id, v.make, v.model, v.year, v.plate_number, v.color, v.status,
    v.created_at, v.repaired_at, c.name,
    coalesce(u.raw_user_meta_data ->> 'shop_name', split_part(u.email, '@', 1))
  from vehicles v
  join customers c on c.id = v.customer_id
  join auth.users u on u.id = v.shop_id
  where v.access_code = p_code;
$$;

-- ------------------------------------------------------------
-- RPC: fetch the update timeline for a vehicle by tracking code.
-- ------------------------------------------------------------
create or replace function get_updates_by_code(p_code text)
returns table (
  id uuid,
  message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select up.id, up.message, up.created_at
  from updates up
  join vehicles v on v.id = up.vehicle_id
  where v.access_code = p_code
  order by up.created_at asc;
$$;

grant execute on function get_vehicle_by_code(text) to anon, authenticated;
grant execute on function get_updates_by_code(text) to anon, authenticated;
