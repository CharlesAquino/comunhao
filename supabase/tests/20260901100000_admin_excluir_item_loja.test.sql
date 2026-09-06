begin;

do $$
begin
  if to_regprocedure('public.admin_excluir_item_loja(uuid)') is null then
    raise exception 'função administrativa de exclusão de item ausente';
  end if;

  if has_function_privilege('authenticated', 'public.admin_excluir_item_loja(uuid)', 'execute') is not true then
    raise exception 'authenticated não possui execução da exclusão administrativa';
  end if;

  if has_function_privilege('anon', 'public.admin_excluir_item_loja(uuid)', 'execute') then
    raise exception 'anon não pode executar a exclusão administrativa';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - exclusão do Tesouro exige função administrativa autenticada';
rollback;
