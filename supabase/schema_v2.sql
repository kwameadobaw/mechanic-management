-- ============================================================
-- Migration v2 — run this in the Supabase SQL editor AFTER
-- schema.sql. Adds:
--   1. A public `shops` table so shop details are visible and
--      editable directly in the Supabase table editor, instead
--      of being buried in auth.users metadata.
--   2. A trigger that auto-creates a shop profile row the moment
--      someone signs up.
--   3. An update to get_vehicle_by_code() so the owner-facing
--      tracking page reads the shop name from this new table.
-- ============================================================

-- ------------------------------------------------------------
-- SHOPS
-- One row per shop owner account, keyed by their auth user id.
-- ------------------------------------------------------------
create table if not exists shops (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

alter table shops enable row level security;

create policy "shop can view own profile"
  on shops for select
  using (id = auth.uid());

create policy "shop can update own profile"
  on shops for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- Auto-create a shop profile whenever a new auth user signs up.
-- Runs as SECURITY DEFINER so it works even before the user has
-- an active session (e.g. while email confirmation is pending).
-- ------------------------------------------------------------
create or replace function public.handle_new_shop_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shops (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'shop_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_shop_user();

-- ------------------------------------------------------------
-- If you already had shop accounts created before this migration,
-- backfill their shops row (safe to run once):
-- ------------------------------------------------------------
insert into public.shops (id, name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'shop_name', split_part(u.email, '@', 1)),
       u.email
from auth.users u
where not exists (select 1 from public.shops s where s.id = u.id)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Update the owner-facing tracking RPC to read the shop name from
-- the `shops` table instead of auth.users metadata.
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
    v.created_at, v.repaired_at, c.name, s.name
  from vehicles v
  join customers c on c.id = v.customer_id
  join shops s on s.id = v.shop_id
  where v.access_code = p_code;
$$;

grant execute on function get_vehicle_by_code(text) to anon, authenticated;
