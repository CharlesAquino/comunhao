begin;

do $$
begin
  if to_regclass('public.loja_pedido_historico') is null then
    raise exception 'histórico de pedidos da Loja ausente';
  end if;
  if to_regprocedure('public.admin_aprovar_pedido_loja(uuid,text,timestamp with time zone,text,text)') is null then
    raise exception 'aprovação logística da Loja ausente';
  end if;
  if to_regprocedure('public.admin_atualizar_logistica_pedido_loja(uuid,text,timestamp with time zone,text,text)') is null then
    raise exception 'atualização logística da Loja ausente';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.loja_pedidos'::regclass and tgname = 'loja_pedido_registrar_logistica' and not tgisinternal) then
    raise exception 'trigger de histórico logístico ausente';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - aprovação e logística do Tesouro são rastreáveis';
rollback;
