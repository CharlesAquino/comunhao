begin;

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.loja_pedidos'::regclass and tgname = 'loja_pedido_registrar_solicitacao' and not tgisinternal) then
    raise exception 'trigger do início do histórico de resgate ausente';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - todo novo resgate inicia com solicitação recebida';
rollback;
