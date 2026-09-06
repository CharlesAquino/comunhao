-- Protocolo Sentinela — endurecimento contra IDOR/BOLA.
-- A autorização é derivada do JWT no servidor; IDs enviados pelo cliente
-- servem somente para localizar o recurso, nunca para provar propriedade.

-- Remove policies legadas que podem coexistir por terem nomes diferentes.
-- Policies permissivas do PostgreSQL são combinadas com OR, portanto uma única
-- policy residual seria suficiente para reabrir o acesso.
do $$
declare
  v_table text;
  v_policy record;
begin
  foreach v_table in array array[
    'usuarios',
    'pedidos',
    'intercessoes',
    'mensagens',
    'app_notificacoes',
    'convites_oracao',
    'kesef_ledger',
    'loja_pedidos'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      for v_policy in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = v_table
      loop
        execute format('drop policy if exists %I on public.%I', v_policy.policyname, v_table);
      end loop;
      execute format('alter table public.%I enable row level security', v_table);
    end if;
  end loop;
end;
$$;

-- Perfil: leitura comunitária permanece, mas mutação é do próprio perfil.
-- A administração continua pelas RPCs auditadas e não por troca direta de ID.
create policy usuarios_select_autenticado
on public.usuarios for select to authenticated
using (true);

create policy usuarios_update_proprio
on public.usuarios for update to authenticated
using (id = public.usuario_atual_id())
with check (id = public.usuario_atual_id());

revoke insert, delete, update on public.usuarios from anon, authenticated;
grant update (nome, foto_url, perfil_capa, status_anel) on public.usuarios to authenticated;

-- Mural legado: o conteúdo é comunitário, a mutação é do autor.
create policy pedidos_select_autenticado
on public.pedidos for select to authenticated
using (true);

create policy pedidos_insert_autor
on public.pedidos for insert to authenticated
with check (autor_id = public.usuario_atual_id());

create policy pedidos_update_autor
on public.pedidos for update to authenticated
using (autor_id = public.usuario_atual_id() or public.usuario_atual_e_admin())
with check (autor_id = public.usuario_atual_id() or public.usuario_atual_e_admin());

create policy pedidos_delete_autor
on public.pedidos for delete to authenticated
using (autor_id = public.usuario_atual_id() or public.usuario_atual_e_admin());

create policy intercessoes_select_autenticado
on public.intercessoes for select to authenticated
using (true);

create policy intercessoes_insert_propria
on public.intercessoes for insert to authenticated
with check (usuario_id = public.usuario_atual_id());

create policy intercessoes_delete_propria
on public.intercessoes for delete to authenticated
using (usuario_id = public.usuario_atual_id());

-- Chat 1:1: participantes podem ler; somente o remetente cria e somente o
-- destinatário altera o marcador de leitura. Privilégio por coluna impede
-- mass assignment de texto, remetente, destinatário ou figurinha.
create policy mensagens_select_participante
on public.mensagens for select to authenticated
using (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
);

create policy mensagens_insert_remetente
on public.mensagens for insert to authenticated
with check (
  remetente_id = public.usuario_atual_id()
  and destinatario_id is distinct from public.usuario_atual_id()
  and lida = false
);

create policy mensagens_update_leitura_destinatario
on public.mensagens for update to authenticated
using (destinatario_id = public.usuario_atual_id())
with check (destinatario_id = public.usuario_atual_id());

revoke insert, update, delete on public.mensagens from anon, authenticated;
grant select on public.mensagens to authenticated;
grant insert (
  remetente_id, destinatario_id, texto, tipo, figurinha_id, figurinha_pacote
) on public.mensagens to authenticated;
grant update (lida) on public.mensagens to authenticated;

-- Notificações: o cliente só pode ler as suas e mudar `lida`.
create policy app_notificacoes_select_propria
on public.app_notificacoes for select to authenticated
using (usuario_id = public.usuario_atual_id());

create policy app_notificacoes_update_leitura_propria
on public.app_notificacoes for update to authenticated
using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());

revoke insert, update, delete on public.app_notificacoes from anon, authenticated;
grant select on public.app_notificacoes to authenticated;
grant update (lida) on public.app_notificacoes to authenticated;

-- Convites são mutados apenas pelas RPCs de domínio. Isso impede que um
-- participante troque IDs, status ou sala por update direto.
create policy convites_oracao_select_participante
on public.convites_oracao for select to authenticated
using (
  remetente_id = public.usuario_atual_id()
  or destinatario_id = public.usuario_atual_id()
);

revoke insert, update, delete on public.convites_oracao from anon, authenticated;
grant select on public.convites_oracao to authenticated;

create or replace function public.cancelar_convite_oracao(p_convite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.usuario_atual_id();
begin
  if v_usuario is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;

  update public.convites_oracao c
  set status = 'recusado'
  where c.id = p_convite_id
    and c.remetente_id = v_usuario
    and c.status = 'pendente';

  if not found then raise exception 'CONVITE_NAO_ENCONTRADO_OU_NAO_AUTORIZADO'; end if;
end;
$$;

revoke all on function public.cancelar_convite_oracao(uuid) from public, anon;
grant execute on function public.cancelar_convite_oracao(uuid) to authenticated;

-- Kesef: ledger privado e imutável pelo cliente. Operadores autorizados usam
-- RPCs/relatórios, sem obter acesso por simples troca de usuario_id.
create policy kesef_ledger_select_proprio
on public.kesef_ledger for select to authenticated
using (usuario_id = public.usuario_atual_id());

create policy kesef_ledger_select_economia
on public.kesef_ledger for select to authenticated
using (public.admin_tem_permissao('economy.read'));

revoke insert, update, delete on public.kesef_ledger from anon, authenticated;
grant select on public.kesef_ledger to authenticated;

drop view if exists public.kesef_saldo;
create view public.kesef_saldo
with (security_invoker = true)
as
select
  k.usuario_id,
  coalesce(sum(k.quantidade), 0)::integer as saldo
from public.kesef_ledger k
group by k.usuario_id;

revoke all on public.kesef_saldo from public, anon;
grant select on public.kesef_saldo to authenticated;

-- Impede crédito/estorno em outro membro usando um p_usuario_id adulterado.
create or replace function public.creditar_kesef(
  p_usuario_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_referencia_id uuid default null
)
returns public.kesef_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_creditado_hoje integer;
  v_cap constant integer := 60;
  v_final integer := p_quantidade;
  v_registro public.kesef_ledger;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust')
     and not (p_tipo = 'indicacao' and public.admin_tem_permissao('people.manage')) then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  perform 1 from public.usuarios u where u.id = p_usuario_id for update;
  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;

  select coalesce(sum(k.quantidade), 0)::integer into v_creditado_hoje
  from public.kesef_ledger k
  where k.usuario_id = p_usuario_id
    and k.tipo <> 'resgate'
    and k.criado_em >= pg_catalog.date_trunc('day', pg_catalog.now());

  if v_creditado_hoje >= v_cap then raise exception 'CAP_DIARIO_ATINGIDO'; end if;
  if v_creditado_hoje + p_quantidade > v_cap then
    v_final := v_cap - v_creditado_hoje;
  end if;

  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (p_usuario_id, p_tipo, v_final, p_referencia_id)
  returning * into v_registro;
  return v_registro;
end;
$$;

create or replace function public.estornar_kesef(
  p_usuario_id uuid,
  p_quantidade integer,
  p_referencia_id uuid default null
)
returns public.kesef_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro public.kesef_ledger;
begin
  if public.usuario_atual_id() is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if not public.admin_tem_permissao('economy.adjust')
     and not public.admin_tem_permissao('store.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  perform 1 from public.usuarios u where u.id = p_usuario_id for update;
  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;

  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (p_usuario_id, 'estorno', p_quantidade, p_referencia_id)
  returning * into v_registro;
  return v_registro;
end;
$$;

revoke all on function public.creditar_kesef(uuid, text, integer, uuid) from public, anon;
grant execute on function public.creditar_kesef(uuid, text, integer, uuid) to authenticated;
revoke all on function public.estornar_kesef(uuid, integer, uuid) from public, anon;
grant execute on function public.estornar_kesef(uuid, integer, uuid) to authenticated;

-- Pedidos da loja: membro lê somente os seus; operador lê por permissão.
-- Toda mutação permanece nas RPCs transacionais.
create policy loja_pedidos_select_proprio
on public.loja_pedidos for select to authenticated
using (usuario_id = public.usuario_atual_id());

create policy loja_pedidos_select_operacao
on public.loja_pedidos for select to authenticated
using (public.admin_tem_permissao('store.manage'));

revoke insert, update, delete on public.loja_pedidos from anon, authenticated;
grant select on public.loja_pedidos to authenticated;

-- Funções privilegiadas do Comunhão Estudos usam catálogo totalmente
-- qualificado e search_path fechado contra shadowing.
alter function public.estudos_pode_ler_curso(uuid) set search_path = '';
alter function public.estudos_concluir_bloco(uuid) set search_path = '';
alter function public.estudos_publicar_curso(uuid) set search_path = '';

comment on view public.kesef_saldo is
  'Saldo protegido pela RLS do ledger via security_invoker; usuario_id do cliente não concede acesso.';
