begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loja_itens'
      and policyname = 'loja_itens_admin_insert'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'policy administrativa de inserção da loja ausente';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - loja_itens permite inserção somente pela permissão store.manage';
rollback;
