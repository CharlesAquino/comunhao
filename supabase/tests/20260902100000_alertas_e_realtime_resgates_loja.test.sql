begin;

do $$
begin
  if to_regprocedure('public.notificar_novo_pedido_loja()') is null then
    raise exception 'função de notificação de novo pedido da Loja ausente';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.loja_pedidos'::regclass
      and tgname = 'loja_pedido_notificar_operacao'
      and not tgisinternal
  ) then
    raise exception 'trigger de notificação operacional da Loja ausente';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loja_pedidos'
  ) then
    raise exception 'loja_pedidos não está publicada para Realtime';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - novo resgate alerta operação e atualiza a fila em tempo real';
rollback;
