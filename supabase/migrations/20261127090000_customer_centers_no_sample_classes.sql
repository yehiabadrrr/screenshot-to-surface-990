-- Customer centers must never reference the Demo Center's sample class catalog (C-201 … C-218).
-- students.class_codes is a transitional column (see the Phase 1 migration); until classes and enrollments
-- are persisted, only the Demo Center may hold class codes. Enforced in the database, not only in the UI.

-- 1. Clear sample class codes already stored on customer students.
update public.students s
   set class_codes = '{}'
  from public.centers c
 where c.id = s.center_id
   and not c.is_demo
   and cardinality(s.class_codes) > 0;

-- 2. Refuse them from now on.
create function public.students_guard_class_codes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if cardinality(new.class_codes) > 0
     and not exists (select 1 from public.centers c where c.id = new.center_id and c.is_demo) then
    raise exception 'Class codes are only allowed in the Demo Center' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger students_guard_class_codes
  before insert or update of class_codes on public.students
  for each row execute function public.students_guard_class_codes();

revoke all on function public.students_guard_class_codes() from public, anon, authenticated;
