-- Account deletion must happen in the database because the mobile client uses
-- a publishable Supabase key and must never receive an admin/service-role key.
-- The function scopes the deletion to the authenticated caller only.
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
begin
  if requesting_user_id is null then
    raise exception 'You must be signed in to delete an account.';
  end if;

  delete from auth.users
  where id = requesting_user_id;

  if not found then
    raise exception 'Account not found.';
  end if;
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
