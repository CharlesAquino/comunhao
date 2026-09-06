-- Policies não podem depender de SELECT do cliente em usuarios.auth_user_id.
-- usuario_atual_id() resolve a identidade com SECURITY DEFINER.

drop policy if exists convites_insert on public.convites_oracao;
create policy convites_insert on public.convites_oracao
for insert to authenticated
with check (remetente_id = public.usuario_atual_id());

drop policy if exists convites_select on public.convites_oracao;
create policy convites_select on public.convites_oracao
for select to authenticated
using (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
);

drop policy if exists convites_update on public.convites_oracao;
create policy convites_update on public.convites_oracao
for update to authenticated
using (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
)
with check (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
);

drop policy if exists mensagens_insert on public.mensagens;
create policy mensagens_insert on public.mensagens
for insert to authenticated
with check (remetente_id = public.usuario_atual_id());

drop policy if exists mensagens_select on public.mensagens;
create policy mensagens_select on public.mensagens
for select to authenticated
using (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
);

drop policy if exists mensagens_update on public.mensagens;
create policy mensagens_update on public.mensagens
for update to authenticated
using (destinatario_id = public.usuario_atual_id())
with check (destinatario_id = public.usuario_atual_id());

-- A policy editorial legada tinha a mesma dependência na coluna privada.
drop policy if exists ebd_ai_executions_admin_select on public.ebd_ai_executions;
create policy ebd_ai_executions_admin_select on public.ebd_ai_executions
for select to authenticated
using (public.admin_tem_permissao('ebd.read'));
