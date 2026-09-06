begin;

do $$
declare tabela text;
begin
  foreach tabela in array array[
    'notificacao_preferencias', 'oracao_jornadas', 'loja_variantes',
    'loja_item_imagens', 'loja_estoque_movimentos', 'ebd_progresso_usuario'
  ] loop
    if to_regclass('public.' || tabela) is null then
      raise exception 'tabela obrigatória ausente: %', tabela;
    end if;
  end loop;
  if to_regprocedure('public.obter_preferencias_notificacao()') is null then
    raise exception 'RPC de preferências ausente';
  end if;
  if to_regprocedure('public.ebd_metricas_editoriais(text,integer)') is null then
    raise exception 'RPC de métricas EBD ausente';
  end if;
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.loja_pedidos'::regclass and attname = 'variante_id' and not attisdropped
  ) then
    raise exception 'loja_pedidos.variante_id ausente';
  end if;
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.loja_itens'::regclass and attname = 'estado' and not attisdropped
  ) then
    raise exception 'loja_itens.estado ausente';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - contratos aditivos de continuidade disponíveis';
rollback;
