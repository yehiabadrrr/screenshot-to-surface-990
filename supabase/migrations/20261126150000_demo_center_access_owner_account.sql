-- Gives the project owner's account admin access to the Demo Center (see supabase/README.md, "Demo Center").
-- Only inserts when that auth user exists in the target project, so it is a no-op elsewhere (tests, other projects).
insert into public.memberships (center_id, user_id, role)
select 'd3e00000-0000-4000-8000-000000000001', u.id, 'admin'
from auth.users u
where u.id = '6b5e3d5f-66c8-47f2-94b8-72b381bad454'
on conflict (center_id, user_id) do nothing;
