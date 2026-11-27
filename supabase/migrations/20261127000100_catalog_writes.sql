-- Owners build their own catalog: branches, teachers and classes can be created and edited in the app.
-- Codes (T-101, C-201) are assigned per center by the database, like student codes. Nothing is deleted:
-- classes and teachers carry enrollments and history, so retiring them comes later as a status.

-- ---------- who may change the catalog ----------
create function public.can_manage_catalog(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.center_members m join public.centers c on c.id = m.center_id
    where m.center_id = target and m.user_id = (select auth.uid()) and m.role = 'owner' and not c.is_demo
  );
$$;
revoke all on function public.can_manage_catalog(uuid) from public, anon;
grant execute on function public.can_manage_catalog(uuid) to authenticated;

-- ---------- codes ----------
-- assign_catalog_code(prefix, first number): T-101, T-102 … / C-201, C-202 … per center.
create function public.assign_catalog_code() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  prefix text := tg_argv[0];
  first_number integer := tg_argv[1]::integer;
  next_number integer;
begin
  if new.code is null or new.code = '' then
    perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.center_id::text, 0));
    execute format(
      'select greatest(coalesce(max(substring(code from %s)::integer), 0), %s) + 1 from public.%I where center_id = $1 and code ~ $2',
      length(prefix) + 1, first_number - 1, tg_table_name)
      into next_number
      using new.center_id, '^' || prefix || '[0-9]+$';
    new.code := prefix || next_number;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_catalog_code() from public, anon, authenticated;

create trigger teachers_assign_code before insert on public.teachers
  for each row execute function public.assign_catalog_code('T-', '101');
create trigger classes_assign_code before insert on public.classes
  for each row execute function public.assign_catalog_code('C-', '201');

-- ---------- policies ----------
create policy branches_insert on public.branches for insert to authenticated
  with check (public.can_manage_catalog(center_id));
create policy branches_update on public.branches for update to authenticated
  using (public.can_manage_catalog(center_id)) with check (public.can_manage_catalog(center_id));
create policy teachers_insert on public.teachers for insert to authenticated
  with check (public.can_manage_catalog(center_id));
create policy teachers_update on public.teachers for update to authenticated
  using (public.can_manage_catalog(center_id)) with check (public.can_manage_catalog(center_id));
create policy classes_insert on public.classes for insert to authenticated
  with check (public.can_manage_catalog(center_id));
create policy classes_update on public.classes for update to authenticated
  using (public.can_manage_catalog(center_id)) with check (public.can_manage_catalog(center_id));

-- ---------- privileges: codes and centers never change ----------
grant insert on public.branches, public.teachers, public.classes to authenticated;
grant update (name) on public.branches to authenticated;
grant update (name, subject, phone, branch_id, pay_model, pay_amount_piastres, pay_percent) on public.teachers to authenticated;
grant update (name, kind, teacher_id, branch_id, days, start_time, capacity, fee_piastres, rule_kind, rule_fee_piastres,
  rule_rate_piastres, rule_charge_no_show, rule_package_sessions, rule_package_price_piastres, rule_count_no_show)
  on public.classes to authenticated;
