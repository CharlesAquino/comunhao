begin;
do $$ begin
  if to_regclass('public.oracao_disponibilidades') is null then raise exception 'oracao_disponibilidades ausente'; end if;
  if to_regprocedure('public.configurar_disponibilidade_oracao(integer,text[])') is null then raise exception 'configurar_disponibilidade_oracao ausente'; end if;
  if to_regprocedure('public.listar_disponiveis_oracao()') is null then raise exception 'listar_disponiveis_oracao ausente'; end if;
  if to_regprocedure('public.encerrar_disponibilidade_oracao()') is null then raise exception 'encerrar_disponibilidade_oracao ausente'; end if;
end $$;
select '1..1';
select 'ok 1 - disponibilidade temporaria da sala disponivel';
rollback;
