-- Phase 1: tenancy (centers, branches, memberships) and persistent students.
-- Every business row carries center_id; access is granted only through memberships, enforced by RLS.
-- Ledger, attendance and classes remain in-memory demo data in the app for this phase.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  -- The single sample center seeded for demos. Customer centers are never demo centers.
  is_demo boolean not null default false,
  -- Source of per-center student codes (S-1001, S-1002, ...). Maintained by a trigger.
  next_student_number integer not null default 1001 check (next_student_number > 0),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (center_id, name),
  -- Lets students reference (branch, center) together so a branch can never belong to another center.
  unique (id, center_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'accountant', 'front_desk', 'teacher')),
  created_at timestamptz not null default now(),
  unique (center_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  branch_id uuid not null,
  student_code text not null check (student_code ~ '^S-[0-9]{1,9}$'),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  phone text not null check (phone ~ '^01[0125][0-9]{8}$'),
  guardian_name text check (guardian_name is null or char_length(guardian_name) <= 120),
  guardian_phone text check (guardian_phone is null or guardian_phone ~ '^01[0125][0-9]{8}$'),
  grade text not null check (char_length(btrim(grade)) between 1 and 40),
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Inactive')),
  joined_on date not null default current_date,
  -- Transitional: ids of classes in the in-memory demo catalog (e.g. C-201) until classes and
  -- enrollments are migrated. Holds no money or attendance data.
  class_codes text[] not null default '{}' check (cardinality(class_codes) <= 20),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (center_id, student_code),
  foreign key (branch_id, center_id) references public.branches (id, center_id)
);
create index students_center_name_idx on public.students (center_id, name);
create index students_center_status_idx on public.students (center_id, status);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, fixed search_path)
-- ---------------------------------------------------------------------------

create function public.is_center_member(p_center uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.center_id = p_center and m.user_id = auth.uid()
  );
$$;

create function public.has_center_role(p_center uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.center_id = p_center and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

-- Creates a customer center, its branches and the caller's owner membership in one transaction.
create function public.create_center(p_name text, p_branches text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_center uuid;
  v_branch text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 2 then
    raise exception 'Center name is required' using errcode = '22023';
  end if;

  insert into public.centers (name, is_demo, created_by)
  values (btrim(p_name), false, v_user)
  returning id into v_center;

  foreach v_branch in array coalesce(p_branches, '{}'::text[]) loop
    if char_length(btrim(coalesce(v_branch, ''))) > 0 then
      insert into public.branches (center_id, name)
      values (v_center, btrim(v_branch))
      on conflict (center_id, name) do nothing;
      v_count := v_count + 1;
    end if;
  end loop;
  if v_count = 0 then
    raise exception 'At least one branch is required' using errcode = '22023';
  end if;

  insert into public.memberships (center_id, user_id, role) values (v_center, v_user, 'owner');
  return v_center;
end;
$$;

-- Assigns S-<n> codes per center; a supplied code (seed data) advances the counter past it.
create function public.assign_student_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if new.student_code is null then
    update public.centers
      set next_student_number = next_student_number + 1
      where id = new.center_id
      returning next_student_number - 1 into v_next;
    if v_next is null then
      raise exception 'Unknown center' using errcode = '23503';
    end if;
    new.student_code := 'S-' || v_next;
  else
    update public.centers
      set next_student_number = greatest(next_student_number, substring(new.student_code from 3)::integer + 1)
      where id = new.center_id;
  end if;
  return new;
end;
$$;

create trigger students_assign_code
  before insert on public.students
  for each row execute function public.assign_student_code();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger students_touch_updated_at
  before update on public.students
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.centers enable row level security;
alter table public.branches enable row level security;
alter table public.memberships enable row level security;
alter table public.students enable row level security;

-- centers: members read; owners/admins rename. Created only through create_center; never deleted by the app.
create policy centers_select on public.centers
  for select to authenticated using (public.is_center_member(id));
create policy centers_update on public.centers
  for update to authenticated
  using (public.has_center_role(id, array['owner', 'admin']))
  with check (public.has_center_role(id, array['owner', 'admin']));

-- branches: members read; owners/admins manage.
create policy branches_select on public.branches
  for select to authenticated using (public.is_center_member(center_id));
create policy branches_insert on public.branches
  for insert to authenticated with check (public.has_center_role(center_id, array['owner', 'admin']));
create policy branches_update on public.branches
  for update to authenticated
  using (public.has_center_role(center_id, array['owner', 'admin']))
  with check (public.has_center_role(center_id, array['owner', 'admin']));
create policy branches_delete on public.branches
  for delete to authenticated using (public.has_center_role(center_id, array['owner', 'admin']));

-- memberships: a user sees its own rows and the rows of centers it belongs to; owners manage.
create policy memberships_select on public.memberships
  for select to authenticated using (user_id = auth.uid() or public.is_center_member(center_id));
create policy memberships_insert on public.memberships
  for insert to authenticated with check (public.has_center_role(center_id, array['owner']));
create policy memberships_update on public.memberships
  for update to authenticated
  using (public.has_center_role(center_id, array['owner']))
  with check (public.has_center_role(center_id, array['owner']));
create policy memberships_delete on public.memberships
  for delete to authenticated using (public.has_center_role(center_id, array['owner']));

-- students: members read; owner/admin/front desk create and edit. No delete: students are deactivated.
create policy students_select on public.students
  for select to authenticated using (public.is_center_member(center_id));
create policy students_insert on public.students
  for insert to authenticated with check (public.has_center_role(center_id, array['owner', 'admin', 'front_desk']));
create policy students_update on public.students
  for update to authenticated
  using (public.has_center_role(center_id, array['owner', 'admin', 'front_desk']))
  with check (public.has_center_role(center_id, array['owner', 'admin', 'front_desk']));

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; authenticated gets only what the app uses.
-- Column grants stop clients from moving rows between centers or rewriting codes and flags.
-- ---------------------------------------------------------------------------

revoke all on table public.centers, public.branches, public.memberships, public.students from public, anon, authenticated;

grant select on table public.centers to authenticated;
grant update (name) on table public.centers to authenticated;

grant select, delete on table public.branches to authenticated;
grant insert (center_id, name) on table public.branches to authenticated;
grant update (name) on table public.branches to authenticated;

grant select, delete on table public.memberships to authenticated;
grant insert (center_id, user_id, role) on table public.memberships to authenticated;
grant update (role) on table public.memberships to authenticated;

grant select on table public.students to authenticated;
grant insert (center_id, branch_id, name, phone, guardian_name, guardian_phone, grade, status, joined_on, class_codes)
  on table public.students to authenticated;
grant update (branch_id, name, phone, guardian_name, guardian_phone, grade, status, class_codes)
  on table public.students to authenticated;

revoke all on function public.is_center_member(uuid) from public, anon;
revoke all on function public.has_center_role(uuid, text[]) from public, anon;
revoke all on function public.create_center(text, text[]) from public, anon;
revoke all on function public.assign_student_code() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.is_center_member(uuid) to authenticated;
grant execute on function public.has_center_role(uuid, text[]) to authenticated;
grant execute on function public.create_center(text, text[]) to authenticated;
