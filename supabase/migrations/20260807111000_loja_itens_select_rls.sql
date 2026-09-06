alter table public.loja_itens enable row level security;

grant select on table public.loja_itens to authenticated;

drop policy if exists loja_itens_authenticated_select on public.loja_itens;
create policy loja_itens_authenticated_select
on public.loja_itens
for select
to authenticated
using (
  ativo = true
  or public.admin_tem_permissao('store.manage')
);
