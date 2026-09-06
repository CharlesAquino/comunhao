-- O pedido novo precisa alcançar a operação da Loja imediatamente.
create or replace function public.notificar_novo_pedido_loja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_nome text;
  v_membro_nome text;
begin
  select nome into v_item_nome from public.loja_itens where id = new.item_id;
  select nome into v_membro_nome from public.usuarios where id = new.usuario_id;

  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  select distinct
    u.id,
    'loja_pedido_novo',
    'Novo resgate solicitado',
    coalesce(v_membro_nome, 'Um membro') || ' solicitou ' || new.quantidade::text || '× ' || coalesce(v_item_nome, 'um item') || '.',
    '/admin/loja',
    jsonb_build_object(
      'pedido_id', new.id,
      'item_id', new.item_id,
      'membro_id', new.usuario_id,
      'status', new.status,
      'tipo', 'loja_pedido_novo'
    ),
    'loja:pedido:' || new.id::text || ':novo:operador'
  from public.usuarios u
  where u.papel = 'admin'
     or exists (
       select 1
       from public.admin_role_assignments ra
       join public.admin_role_permissions rp on rp.role_code = ra.role_code
       where ra.usuario_id = u.id
         and ra.active = true
         and rp.permission_code = 'store.manage'
     )
  on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;

  return new;
end;
$$;

drop trigger if exists loja_pedido_notificar_operacao on public.loja_pedidos;
create trigger loja_pedido_notificar_operacao
after insert on public.loja_pedidos
for each row execute function public.notificar_novo_pedido_loja();

alter table public.loja_pedidos replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loja_pedidos'
  ) then
    alter publication supabase_realtime add table public.loja_pedidos;
  end if;
end;
$$;
