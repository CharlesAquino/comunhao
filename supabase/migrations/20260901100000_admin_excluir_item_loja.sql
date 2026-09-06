-- Exclusão controlada de itens sem histórico. Pedidos e movimentos são registros
-- financeiros/operacionais e tornam o arquivamento obrigatório.
create or replace function public.admin_excluir_item_loja(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('store.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  perform 1
  from public.loja_itens
  where id = p_item_id
  for update;

  if not found then
    raise exception 'ITEM_NAO_ENCONTRADO';
  end if;

  if exists (select 1 from public.loja_pedidos where item_id = p_item_id)
     or exists (select 1 from public.loja_estoque_movimentos where item_id = p_item_id) then
    raise exception 'ITEM_COM_HISTORICO_NAO_PODE_SER_EXCLUIDO';
  end if;

  delete from public.loja_itens where id = p_item_id;
end;
$$;

revoke all on function public.admin_excluir_item_loja(uuid) from public, anon;
grant execute on function public.admin_excluir_item_loja(uuid) to authenticated;
