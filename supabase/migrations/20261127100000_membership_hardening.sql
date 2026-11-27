-- Membership hardening (audit 2026-11-27, P1.3 / P1.4).
--  1. Clients can no longer insert memberships directly. Before this, an owner could add any user id with any
--     role. Memberships now come only from create_center (the creator becomes owner) and from invitations
--     that the invited, email-confirmed user accepts.
--  2. A center can never lose its last owner through the API.
--  3. Center creation is rate limited per user.

-- ---------------------------------------------------------------------------
-- 1. No direct membership inserts
-- ---------------------------------------------------------------------------
drop policy memberships_insert on public.memberships;
revoke insert on table public.memberships from authenticated;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Ownership is never granted by invitation.
  role text not null check (role in ('admin', 'accountant', 'front_desk', 'teacher')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);
-- One open invitation per email per center.
create unique index invitations_open_email_idx on public.invitations (center_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.invitations enable row level security;
create policy invitations_select on public.invitations
  for select to authenticated using (public.has_center_role(center_id, array['owner', 'admin']));
revoke all on table public.invitations from public, anon, authenticated;
grant select on table public.invitations to authenticated;

-- Owners invite any staff role; admins invite everything except admin.
create function public.invite_member(p_center uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not (public.has_center_role(p_center, array['owner'])
          or (p_role <> 'admin' and public.has_center_role(p_center, array['admin']))) then
    raise exception 'You do not have permission to invite this role' using errcode = '42501';
  end if;
  if (select count(*) from public.invitations i
       where i.center_id = p_center and i.created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many invitations today' using errcode = '54000';
  end if;
  insert into public.invitations (center_id, email, role, invited_by)
  values (p_center, v_email, p_role, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;

create function public.revoke_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_center uuid;
begin
  select center_id into v_center from public.invitations where id = p_invitation;
  if v_center is null or not public.has_center_role(v_center, array['owner', 'admin']) then
    raise exception 'Invitation not found' using errcode = '42501';
  end if;
  update public.invitations set revoked_at = now()
   where id = p_invitation and accepted_at is null and revoked_at is null;
end;
$$;

-- Only the invited person can accept: the caller's confirmed account email must match the invitation.
create function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_inv public.invitations%rowtype;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select lower(u.email), u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_user;
  select * into v_inv from public.invitations where token = p_token for update;
  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'This invitation is no longer valid' using errcode = '22023';
  end if;
  if v_confirmed is null or v_email is distinct from lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;
  if exists (select 1 from public.memberships m where m.center_id = v_inv.center_id and m.user_id = v_user) then
    raise exception 'You are already a member of this center' using errcode = '23505';
  end if;
  insert into public.memberships (center_id, user_id, role) values (v_inv.center_id, v_user, v_inv.role);
  update public.invitations set accepted_at = now(), accepted_by = v_user where id = v_inv.id;
  return v_inv.center_id;
end;
$$;

revoke all on function public.invite_member(uuid, text, text) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Keep at least one owner
-- ---------------------------------------------------------------------------
-- Enforced for API callers (role "authenticated"). Cascades from deleting a center or an auth user run as the
-- table owner and are not blocked.
create function public.memberships_keep_an_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (select 1 from public.memberships m
                      where m.center_id = old.center_id and m.role = 'owner' and m.id <> old.id) then
    raise exception 'A center must keep at least one owner' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger memberships_keep_an_owner
  before update of role or delete on public.memberships
  for each row execute function public.memberships_keep_an_owner();

-- ---------------------------------------------------------------------------
-- 3. Rate-limited center creation (same behavior otherwise)
-- ---------------------------------------------------------------------------
create or replace function public.create_center(p_name text, p_branches text[])
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
  if (select count(*) from public.centers c where c.created_by = v_user and c.created_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many centers created today' using errcode = '54000';
  end if;
  if (select count(*) from public.memberships m where m.user_id = v_user and m.role = 'owner') >= 10 then
    raise exception 'Center limit reached' using errcode = '54000';
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
