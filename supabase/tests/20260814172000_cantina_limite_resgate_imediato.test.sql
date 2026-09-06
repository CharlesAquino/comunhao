begin;

do $$
begin
  if to_regprocedure('public.cantina_validar_limite_resgate_imediato()') is null then
    raise exception 'função de proteção do limite por membro ausente';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.cantina_resgates'::regclass
      and tgname = 'cantina_validar_limite_resgate_imediato_trigger'
      and not tgisinternal
  ) then
    raise exception 'trigger de proteção do limite por membro ausente';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.cantina_validar_limite_resgate_imediato()',
    'execute'
  ) then
    raise exception 'authenticated pode executar diretamente a função de trigger';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - limite por membro protegido também no resgate imediato';
rollback;
