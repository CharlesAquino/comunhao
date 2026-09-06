do $$
begin
  if to_regprocedure('public.solicitar_resgate_loja(uuid,integer,uuid)') is null then
    raise exception 'RPC solicitar_resgate_loja ausente';
  end if;
  if to_regprocedure('public.admin_processar_pedido_loja(uuid,text,text)') is null then
    raise exception 'RPC admin_processar_pedido_loja ausente';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loja_pedidos'
      and column_name = 'idempotencia_chave'
  ) then
    raise exception 'loja_pedidos.idempotencia_chave ausente';
  end if;
  if has_table_privilege('authenticated', 'public.loja_pedidos', 'insert') then
    raise exception 'authenticated ainda pode inserir pedido fora da RPC';
  end if;
end;
$$;

select 'tesouro_fluxo_transacional_ok' as result;
