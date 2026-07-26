-- ============================================================
-- Migration v3 — security hardening. Run in the Supabase SQL
-- editor after schema.sql and schema_v2.sql.
--
-- Findings addressed (see SECURITY.md for the full write-up):
--   1. RLS gap: a shop could insert a vehicle pointing at another
--      shop's customer_id (RLS only checked shop_id, not that the
--      customer actually belonged to that shop).
--   2. Tracking RPCs were reachable by any Postgres role by
--      default; explicitly scoped execute grants to anon/
--      authenticated only.
--   3. No server-side format check on tracking codes before
--      hitting the table.
--   4. updates.created_by was a plain client-supplied value with
--      nothing stopping a shop from writing an arbitrary user id
--      into it.
--   5. No size/format limits on free-text or email fields at the
--      database layer (belt-and-suspenders alongside client-side
--      limits, which can always be bypassed).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Close the cross-tenant vehicle/customer linkage gap.
-- A vehicle's customer must belong to the same shop that owns
-- the vehicle — enforced at write time, not just assumed.
-- ------------------------------------------------------------
drop policy if exists "shop manages own vehicles" on vehicles;
create policy "shop manages own vehicles"
  on vehicles for all
  using (shop_id = auth.uid())
  with check (
    shop_id = auth.uid()
    and exists (
      select 1 from customers c
      where c.id = customer_id
        and c.shop_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. Lock down execute privileges on the anon-facing RPCs.
-- Newly created functions get EXECUTE granted to PUBLIC by
-- default in Postgres; revoke that and grant only to the roles
-- that actually need it.
-- ------------------------------------------------------------
revoke all on function get_vehicle_by_code(text) from public;
revoke all on function get_updates_by_code(text) from public;

-- ------------------------------------------------------------
-- 3. Re-create both RPCs with a server-side format check so
-- malformed input (wrong length/characters) is rejected before
-- it ever touches the vehicles table.
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
  where p_code ~ '^[A-Za-z0-9]{16}$'
    and v.access_code = upper(p_code);
$$;

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
  where p_code ~ '^[A-Za-z0-9]{16}$'
    and v.access_code = upper(p_code)
  order by up.created_at asc;
$$;

grant execute on function get_vehicle_by_code(text) to anon, authenticated;
grant execute on function get_updates_by_code(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Stop the client from being able to write an arbitrary user
-- id into updates.created_by. Default it server-side and only
-- allow it to be the caller's own id (or absent).
-- ------------------------------------------------------------
alter table updates alter column created_by set default auth.uid();

drop policy if exists "shop manages updates on own vehicles" on updates;
create policy "shop manages updates on own vehicles"
  on updates for all
  using (
    exists (select 1 from vehicles v where v.id = updates.vehicle_id and v.shop_id = auth.uid())
  )
  with check (
    exists (select 1 from vehicles v where v.id = updates.vehicle_id and v.shop_id = auth.uid())
    and (created_by = auth.uid() or created_by is null)
  );

-- ------------------------------------------------------------
-- 5. Defense-in-depth: size and format limits at the database
-- layer, since client-side limits can always be bypassed by
-- anyone calling the API directly. Wrapped in existence checks
-- so this migration can be re-run safely.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_email_format') then
    alter table customers add constraint customers_email_format
      check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shops_email_format') then
    alter table shops add constraint shops_email_format
      check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'updates_message_length') then
    alter table updates add constraint updates_message_length
      check (char_length(message) between 1 and 4000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'vehicles_notes_length') then
    alter table vehicles add constraint vehicles_notes_length
      check (notes is null or char_length(notes) <= 2000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'customers_name_length') then
    alter table customers add constraint customers_name_length
      check (char_length(name) between 1 and 200);
  end if;
end $$;
