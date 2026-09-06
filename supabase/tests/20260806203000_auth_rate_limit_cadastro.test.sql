begin;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.auth_rate_limits'::regclass
       and conname = 'auth_rate_limits_finalidade_check'
       and position('cadastro' in pg_get_constraintdef(oid)) > 0
  ) then
    raise exception 'finalidade cadastro ausente do limite de autenticação';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - rate limit de cadastro';
rollback;
