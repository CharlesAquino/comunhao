begin;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('convites_oracao', 'mensagens', 'ebd_ai_executions')
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth_user_id%'
  ) then
    raise exception 'policy ainda depende de auth_user_id';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - policies usam identidade segura';
rollback;
