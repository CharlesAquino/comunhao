alter table public.loja_itens enable row level security;

grant select, insert, update, delete on table public.loja_itens to authenticated;

drop policy if exists loja_itens_admin_insert on public.loja_itens;
create policy loja_itens_admin_insert
on public.loja_itens
for insert
to authenticated
with check (public.admin_tem_permissao('store.manage'));

drop policy if exists loja_itens_admin_update on public.loja_itens;
create policy loja_itens_admin_update
on public.loja_itens
for update
to authenticated
using (public.admin_tem_permissao('store.manage'))
with check (public.admin_tem_permissao('store.manage'));

drop policy if exists loja_itens_admin_delete on public.loja_itens;
create policy loja_itens_admin_delete
on public.loja_itens
for delete
to authenticated
using (public.admin_tem_permissao('store.manage'));
