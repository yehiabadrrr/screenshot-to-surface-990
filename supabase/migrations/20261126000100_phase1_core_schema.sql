-- Phase 1: centers, membership and the student directory.
-- The ledger and attendance stay in the app's memory until Phase 2; nothing here stores money movements.
-- Money columns are whole piastres (1 EGP = 100).

-- ---------- types ----------
create type public.member_role as enum ('owner', 'accountant', 'front_desk', 'teacher');
create type public.student_status as enum ('active', 'paused', 'inactive');
create type public.class_kind as enum ('tutoring', 'language_course');
create type public.pay_model as enum ('monthly', 'per_session', 'per_student', 'percentage');
create type public.rule_kind as enum ('monthly', 'per_session', 'package');

-- ---------- tables ----------
create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
-- At most one demo center.
create unique index centers_single_demo on public.centers (is_demo) where is_demo;

create table public.center_members (
  center_id uuid not null references public.centers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (center_id, user_id)
);
create index center_members_user_idx on public.center_members (user_id);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (center_id, name),
  unique (center_id, id)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  code text not null,
  name text not null check (length(btrim(name)) between 2 and 120),
  subject text not null default '',
  phone text not null default '',
  branch_id uuid,
  pay_model public.pay_model not null,
  pay_amount_piastres bigint check (pay_amount_piastres >= 0),
  pay_percent numeric(5, 2) check (pay_percent between 0 and 100),
  created_at timestamptz not null default now(),
  unique (center_id, code),
  unique (center_id, id),
  foreign key (center_id, branch_id) references public.branches (center_id, id),
  check ((pay_model = 'percentage') = (pay_percent is not null)),
  check ((pay_model = 'percentage') = (pay_amount_piastres is null))
);

-- A billing rule is stored as nullable columns; the check constraints keep each kind complete.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  code text not null,
  name text not null check (length(btrim(name)) between 2 and 120),
  kind public.class_kind not null,
  teacher_id uuid,
  branch_id uuid,
  days text not null default '',
  start_time text not null default '',
  capacity integer not null check (capacity > 0),
  fee_piastres bigint not null check (fee_piastres >= 0),
  rule_kind public.rule_kind not null,
  rule_fee_piastres bigint,
  rule_rate_piastres bigint,
  rule_charge_no_show boolean,
  rule_package_sessions integer,
  rule_package_price_piastres bigint,
  rule_count_no_show boolean,
  created_at timestamptz not null default now(),
  unique (center_id, code),
  unique (center_id, id),
  foreign key (center_id, teacher_id) references public.teachers (center_id, id),
  foreign key (center_id, branch_id) references public.branches (center_id, id),
  constraint classes_rule_complete check (
    (rule_kind = 'monthly' and rule_fee_piastres > 0)
    or (rule_kind = 'per_session' and rule_rate_piastres > 0 and rule_charge_no_show is not null)
    or (rule_kind = 'package' and rule_package_sessions > 0 and rule_package_price_piastres > 0 and rule_count_no_show is not null)
  )
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  -- Human-readable ID (S-1001), unique per center, assigned by the database when not given.
  code text not null,
  name text not null check (length(btrim(name)) between 3 and 80),
  phone text not null check (phone ~ '^01[0125][0-9]{8}$'),
  guardian_name text not null default '',
  guardian_phone text not null default '' check (guardian_phone = '' or guardian_phone ~ '^01[0125][0-9]{8}$'),
  branch_id uuid,
  grade text not null default '',
  status public.student_status not null default 'active',
  joined_on date not null default current_date,
  -- Sample-data statistic carried over from the demo center; null for real students until attendance is stored.
  demo_attendance_pct smallint check (demo_attendance_pct between 0 and 100),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (center_id, code),
  unique (center_id, id),
  foreign key (center_id, branch_id) references public.branches (center_id, id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  student_id uuid not null,
  class_id uuid not null,
  -- Optional per-student billing rule; all rule columns null means the class rule applies.
  rule_kind public.rule_kind,
  rule_fee_piastres bigint,
  rule_rate_piastres bigint,
  rule_charge_no_show boolean,
  rule_package_sessions integer,
  rule_package_price_piastres bigint,
  rule_count_no_show boolean,
  created_at timestamptz not null default now(),
  unique (student_id, class_id),
  foreign key (center_id, student_id) references public.students (center_id, id) on delete cascade,
  foreign key (center_id, class_id) references public.classes (center_id, id),
  constraint enrollments_rule_complete check (
    rule_kind is null
    or (rule_kind = 'monthly' and rule_fee_piastres > 0)
    or (rule_kind = 'per_session' and rule_rate_piastres > 0 and rule_charge_no_show is not null)
    or (rule_kind = 'package' and rule_package_sessions > 0 and rule_package_price_piastres > 0 and rule_count_no_show is not null)
  )
);
create index enrollments_class_idx on public.enrollments (class_id);

-- ---------- access helpers ----------
-- SECURITY DEFINER so policies can read membership without recursing through center_members' own policy.
create function public.is_center_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.center_members m where m.center_id = target and m.user_id = (select auth.uid()));
$$;

-- Staff who may change the student directory. The demo center is read-only for everyone.
create function public.can_edit_students(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.center_members m join public.centers c on c.id = m.center_id
    where m.center_id = target and m.user_id = (select auth.uid())
      and m.role in ('owner', 'front_desk', 'accountant') and not c.is_demo
  );
$$;

create function public.is_demo_center(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.centers c where c.id = target and c.is_demo);
$$;

-- ---------- student codes ----------
create function public.assign_student_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.code is null or new.code = '' then
    -- Serialize per center so two people adding students at once never get the same code.
    perform pg_advisory_xact_lock(hashtextextended('students:' || new.center_id::text, 0));
    select 'S-' || (coalesce(max(substring(s.code from 3)::integer), 1000) + 1)
      into new.code
      from public.students s
     where s.center_id = new.center_id and s.code ~ '^S-[0-9]+$';
  end if;
  return new;
end;
$$;
create trigger students_assign_code before insert on public.students
  for each row execute function public.assign_student_code();

-- ---------- onboarding ----------
-- The only way to create a center: the caller becomes its owner and gets one branch. No sample data is added.
create function public.create_center(center_name text, branch_name text default 'Main branch', owner_name text default '')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  new_center uuid;
begin
  if uid is null then
    raise exception 'Sign in before creating a center' using errcode = '28000';
  end if;
  if exists (select 1 from public.center_members m where m.user_id = uid) then
    raise exception 'This account already belongs to a center' using errcode = '23505';
  end if;
  insert into public.centers (name, created_by) values (btrim(center_name), uid) returning id into new_center;
  insert into public.center_members (center_id, user_id, role, display_name) values (new_center, uid, 'owner', btrim(owner_name));
  insert into public.branches (center_id, name) values (new_center, btrim(coalesce(nullif(btrim(branch_name), ''), 'Main branch')));
  return new_center;
end;
$$;

-- Adds a student and their enrollments in one transaction. SECURITY INVOKER: row-level security applies.
-- enrollment_rows: [{ "class_id": uuid, "rule_kind": ..., "rule_fee_piastres": ..., ... }]
create function public.add_student(
  target_center uuid,
  student_name text,
  student_phone text,
  guardian text default '',
  guardian_phone_number text default '',
  student_grade text default '',
  enrollment_rows jsonb default '[]'::jsonb
) returns public.students
language plpgsql security invoker set search_path = '' as $$
declare
  first_class uuid := nullif(enrollment_rows -> 0 ->> 'class_id', '')::uuid;
  branch uuid;
  created public.students;
begin
  select c.branch_id into branch from public.classes c where c.id = first_class and c.center_id = target_center;
  if branch is null then
    select b.id into branch from public.branches b where b.center_id = target_center order by b.created_at, b.name limit 1;
  end if;
  insert into public.students (center_id, name, phone, guardian_name, guardian_phone, grade, branch_id)
  values (target_center, btrim(student_name), student_phone, btrim(guardian), guardian_phone_number, student_grade, branch)
  returning * into created;
  insert into public.enrollments (
    center_id, student_id, class_id, rule_kind, rule_fee_piastres, rule_rate_piastres, rule_charge_no_show,
    rule_package_sessions, rule_package_price_piastres, rule_count_no_show
  )
  select target_center, created.id, (e ->> 'class_id')::uuid, (e ->> 'rule_kind')::public.rule_kind,
         (e ->> 'rule_fee_piastres')::bigint, (e ->> 'rule_rate_piastres')::bigint, (e ->> 'rule_charge_no_show')::boolean,
         (e ->> 'rule_package_sessions')::integer, (e ->> 'rule_package_price_piastres')::bigint, (e ->> 'rule_count_no_show')::boolean
    from jsonb_array_elements(enrollment_rows) e;
  return created;
end;
$$;

-- ---------- row-level security ----------
alter table public.centers enable row level security;
alter table public.center_members enable row level security;
alter table public.branches enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;

create policy centers_read on public.centers for select to authenticated
  using (is_demo or public.is_center_member(id));
create policy members_read on public.center_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_center_member(center_id));
create policy branches_read on public.branches for select to authenticated
  using (public.is_center_member(center_id) or public.is_demo_center(center_id));
create policy teachers_read on public.teachers for select to authenticated
  using (public.is_center_member(center_id) or public.is_demo_center(center_id));
create policy classes_read on public.classes for select to authenticated
  using (public.is_center_member(center_id) or public.is_demo_center(center_id));
create policy students_read on public.students for select to authenticated
  using (public.is_center_member(center_id) or public.is_demo_center(center_id));
create policy students_insert on public.students for insert to authenticated
  with check (public.can_edit_students(center_id));
create policy students_update on public.students for update to authenticated
  using (public.can_edit_students(center_id)) with check (public.can_edit_students(center_id));
create policy enrollments_read on public.enrollments for select to authenticated
  using (public.is_center_member(center_id) or public.is_demo_center(center_id));
create policy enrollments_insert on public.enrollments for insert to authenticated
  with check (public.can_edit_students(center_id));
create policy enrollments_delete on public.enrollments for delete to authenticated
  using (public.can_edit_students(center_id));

-- ---------- privileges ----------
-- Supabase grants broad table privileges by default; narrow them so policies are not the only barrier.
revoke all on public.centers, public.center_members, public.branches, public.teachers, public.classes, public.students, public.enrollments from anon, authenticated;
grant select on public.centers, public.center_members, public.branches, public.teachers, public.classes, public.students, public.enrollments to authenticated;
grant insert on public.students, public.enrollments to authenticated;
-- Students are never deleted (set status to inactive); the code and center never change.
grant update (name, phone, guardian_name, guardian_phone, branch_id, grade, status) on public.students to authenticated;
grant delete on public.enrollments to authenticated;

revoke all on function public.is_center_member(uuid), public.can_edit_students(uuid), public.is_demo_center(uuid) from public, anon;
grant execute on function public.is_center_member(uuid), public.can_edit_students(uuid), public.is_demo_center(uuid) to authenticated;
revoke all on function public.create_center(text, text, text) from public, anon;
grant execute on function public.create_center(text, text, text) to authenticated;
revoke all on function public.add_student(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.add_student(uuid, text, text, text, text, text, jsonb) to authenticated;
revoke all on function public.assign_student_code() from public, anon, authenticated;
