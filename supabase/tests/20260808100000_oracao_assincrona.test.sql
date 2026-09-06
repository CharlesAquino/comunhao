begin;
do $$
begin
  if to_regclass('public.oracao_pedidos') is null then raise exception 'oracao_pedidos ausente'; end if;
  if to_regclass('public.oracao_intercessoes') is null then raise exception 'oracao_intercessoes ausente'; end if;
  if to_regprocedure('public.criar_pedido_oracao(text,text,text,text,integer)') is null then raise exception 'criar_pedido_oracao ausente'; end if;
  if to_regprocedure('public.listar_pedidos_oracao_disponiveis(integer)') is null then raise exception 'listar_pedidos_oracao_disponiveis ausente'; end if;
  if to_regprocedure('public.acolher_pedido_oracao(uuid)') is null then raise exception 'acolher_pedido_oracao ausente'; end if;
  if to_regprocedure('public.confirmar_intercessao_oracao(uuid,text)') is null then raise exception 'confirmar_intercessao_oracao ausente'; end if;
end;
$$;
select '1..1';
select 'ok 1 - contratos de oração assíncrona disponíveis';
rollback;
