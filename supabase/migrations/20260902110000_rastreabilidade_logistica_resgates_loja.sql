-- A aprovação financeira e a logística de entrega são etapas distintas.
alter table public.loja_pedidos
  add column if not exists etapa_logistica text not null default 'previsao_pendente',
  add column if not exists entrega_agendada_em timestamptz,
  add column if not exists entrega_local text,
  add column if not exists instrucoes_retirada text,
  add column if not exists logistica_atualizada_em timestamptz,
  add column if not exists logistica_atualizada_por_id uuid references public.usuarios(id) on delete set null;

alter table public.loja_pedidos drop constraint if exists loja_pedidos_etapa_logistica_check;
alter table public.loja_pedidos add constraint loja_pedidos_etapa_logistica_check
  check (etapa_logistica in ('previsao_pendente', 'agendado', 'alinhamento_retirada'));

create table if not exists public.loja_pedido_historico (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.loja_pedidos(id) on delete restrict,
  tipo text not null check (tipo in ('solicitado', 'processado', 'agendado', 'alinhamento_retirada', 'entregue', 'rejeitado')),
  titulo text not null,
  descricao text not null default '',
  etapa_logistica text check (etapa_logistica is null or etapa_logistica in ('previsao_pendente', 'agendado', 'alinhamento_retirada')),
  entrega_agendada_em timestamptz,
  entrega_local text,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  ocorrido_em timestamptz not null default now()
);

create index if not exists loja_pedido_historico_pedido_ocorrido_idx
  on public.loja_pedido_historico(pedido_id, ocorrido_em desc);

alter table public.loja_pedido_historico enable row level security;
drop policy if exists loja_pedido_historico_leitura_propria_ou_operacao on public.loja_pedido_historico;
create policy loja_pedido_historico_leitura_propria_ou_operacao
on public.loja_pedido_historico for select to authenticated
using (
  exists (
    select 1 from public.loja_pedidos p
    where p.id = pedido_id
      and (p.usuario_id = public.usuario_atual_id() or public.admin_tem_permissao('store.manage'))
  )
);
revoke all on public.loja_pedido_historico from public, anon, authenticated;
grant select on public.loja_pedido_historico to authenticated;

create or replace function public.descricao_logistica_pedido_loja(
  p_etapa text,
  p_entrega_agendada_em timestamptz,
  p_entrega_local text,
  p_instrucoes text
)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_etapa
    when 'agendado' then
      'Seu resgate foi agendado para ' ||
      coalesce(to_char(p_entrega_agendada_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI'), 'uma data a confirmar') ||
      case when nullif(btrim(coalesce(p_entrega_local, '')), '') is not null then ' no ' || btrim(p_entrega_local) else '' end ||
      case when nullif(btrim(coalesce(p_instrucoes, '')), '') is not null then '. ' || btrim(p_instrucoes) else '.' end
    when 'alinhamento_retirada' then
      'Seu resgate foi processado. O Gestor do Tesouro alinhará com você a data e o local de retirada.' ||
      case when nullif(btrim(coalesce(p_instrucoes, '')), '') is not null then ' ' || btrim(p_instrucoes) else '' end
    else
      'Seu pedido foi processado. Em breve você receberá uma previsão de entrega.' ||
      case when nullif(btrim(coalesce(p_instrucoes, '')), '') is not null then ' ' || btrim(p_instrucoes) else '' end
  end;
$$;

create or replace function public.titulo_logistica_pedido_loja(p_etapa text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_etapa
    when 'agendado' then 'Resgate agendado'
    when 'alinhamento_retirada' then 'Alinhamento de retirada'
    else 'Pedido processado'
  end;
$$;

create or replace function public.admin_aprovar_pedido_loja(
  p_pedido_id uuid,
  p_etapa_logistica text default 'previsao_pendente',
  p_entrega_agendada_em timestamptz default null,
  p_entrega_local text default null,
  p_instrucoes_retirada text default null
)
returns public.loja_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := public.usuario_atual_id();
  v_pedido public.loja_pedidos;
  v_resultado public.loja_pedidos;
  v_saldo_anterior integer;
  v_etapa text := coalesce(nullif(btrim(p_etapa_logistica), ''), 'previsao_pendente');
  v_local text := nullif(btrim(coalesce(p_entrega_local, '')), '');
  v_instrucoes text := nullif(btrim(coalesce(p_instrucoes_retirada, '')), '');
begin
  if not public.admin_tem_permissao('store.manage') then raise exception 'PERMISSAO_NEGADA'; end if;
  if v_etapa not in ('previsao_pendente', 'agendado', 'alinhamento_retirada')
     or length(coalesce(v_instrucoes, '')) > 600
     or (v_etapa = 'agendado' and (p_entrega_agendada_em is null or v_local is null)) then
    raise exception 'LOGISTICA_INVALIDA';
  end if;

  select p.* into v_pedido from public.loja_pedidos p where p.id = p_pedido_id for update;
  if v_pedido.id is null then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if v_pedido.status <> 'pendente' then raise exception 'TRANSICAO_INVALIDA'; end if;

  if v_pedido.variante_id is not null then
    select estoque into v_saldo_anterior from public.loja_variantes where id = v_pedido.variante_id for update;
    update public.loja_variantes set estoque = estoque - v_pedido.quantidade, atualizado_em = now()
    where id = v_pedido.variante_id and ativo and estoque >= v_pedido.quantidade;
    if not found then raise exception 'ESTOQUE_INSUFICIENTE'; end if;
  else
    select estoque into v_saldo_anterior from public.loja_itens where id = v_pedido.item_id for update;
  end if;
  update public.loja_itens set estoque = estoque - v_pedido.quantidade
  where id = v_pedido.item_id and ativo and estado = 'ativo' and estoque >= v_pedido.quantidade;
  if not found then raise exception 'ESTOQUE_INSUFICIENTE'; end if;

  perform public.debitar_kesef(v_pedido.usuario_id, v_pedido.kesef_debitado, v_pedido.id);
  insert into public.loja_estoque_movimentos (
    item_id, variante_id, pedido_id, quantidade, tipo, saldo_anterior, saldo_posterior, responsavel_id
  ) values (
    v_pedido.item_id, v_pedido.variante_id, v_pedido.id, -v_pedido.quantidade, 'baixa',
    v_saldo_anterior, v_saldo_anterior - v_pedido.quantidade, v_admin_id
  );

  update public.loja_pedidos set
    status = 'aprovado',
    processado_por_admin_id = v_admin_id,
    processado_em = now(),
    codigo_retirada = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    reservado_em = now(),
    etapa_logistica = v_etapa,
    entrega_agendada_em = case when v_etapa = 'agendado' then p_entrega_agendada_em else null end,
    entrega_local = case when v_etapa = 'agendado' then v_local else null end,
    instrucoes_retirada = v_instrucoes,
    logistica_atualizada_em = now(),
    logistica_atualizada_por_id = v_admin_id
  where id = p_pedido_id returning * into v_resultado;

  insert into public.admin_audit_log (actor_user_id, permission, action, entity_type, entity_id, before_data, after_data)
  values (v_admin_id, 'store.manage', 'store.order.approved_with_logistics', 'loja_pedidos', p_pedido_id::text, to_jsonb(v_pedido), to_jsonb(v_resultado));
  return v_resultado;
end;
$$;

create or replace function public.admin_atualizar_logistica_pedido_loja(
  p_pedido_id uuid,
  p_etapa_logistica text,
  p_entrega_agendada_em timestamptz default null,
  p_entrega_local text default null,
  p_instrucoes_retirada text default null
)
returns public.loja_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := public.usuario_atual_id();
  v_pedido public.loja_pedidos;
  v_resultado public.loja_pedidos;
  v_etapa text := coalesce(nullif(btrim(p_etapa_logistica), ''), 'previsao_pendente');
  v_local text := nullif(btrim(coalesce(p_entrega_local, '')), '');
  v_instrucoes text := nullif(btrim(coalesce(p_instrucoes_retirada, '')), '');
begin
  if not public.admin_tem_permissao('store.manage') then raise exception 'PERMISSAO_NEGADA'; end if;
  if v_etapa not in ('previsao_pendente', 'agendado', 'alinhamento_retirada')
     or length(coalesce(v_instrucoes, '')) > 600
     or (v_etapa = 'agendado' and (p_entrega_agendada_em is null or v_local is null)) then
    raise exception 'LOGISTICA_INVALIDA';
  end if;

  select p.* into v_pedido from public.loja_pedidos p where p.id = p_pedido_id for update;
  if v_pedido.id is null then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if v_pedido.status <> 'aprovado' then raise exception 'TRANSICAO_INVALIDA'; end if;

  update public.loja_pedidos set
    etapa_logistica = v_etapa,
    entrega_agendada_em = case when v_etapa = 'agendado' then p_entrega_agendada_em else null end,
    entrega_local = case when v_etapa = 'agendado' then v_local else null end,
    instrucoes_retirada = v_instrucoes,
    logistica_atualizada_em = now(),
    logistica_atualizada_por_id = v_admin_id
  where id = p_pedido_id returning * into v_resultado;

  insert into public.admin_audit_log (actor_user_id, permission, action, entity_type, entity_id, before_data, after_data)
  values (v_admin_id, 'store.manage', 'store.order.logistics_updated', 'loja_pedidos', p_pedido_id::text, to_jsonb(v_pedido), to_jsonb(v_resultado));
  return v_resultado;
end;
$$;

revoke all on function public.admin_aprovar_pedido_loja(uuid, text, timestamptz, text, text) from public, anon;
grant execute on function public.admin_aprovar_pedido_loja(uuid, text, timestamptz, text, text) to authenticated;
revoke all on function public.admin_atualizar_logistica_pedido_loja(uuid, text, timestamptz, text, text) from public, anon;
grant execute on function public.admin_atualizar_logistica_pedido_loja(uuid, text, timestamptz, text, text) to authenticated;

-- Atualiza o aviso já existente de aprovação com a orientação logística escolhida.
create or replace function public.notificar_status_resgate_loja()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_item_nome text;
  v_tipo text;
  v_corpo text;
begin
  if old.status is not distinct from new.status or new.status not in ('aprovado', 'rejeitado', 'entregue') then return new; end if;
  select nome into v_item_nome from public.loja_itens where id = new.item_id;
  v_tipo := case new.status when 'aprovado' then 'loja_pedido_aprovado' when 'rejeitado' then 'loja_pedido_rejeitado' else 'loja_pedido_entregue' end;
  v_corpo := case new.status
    when 'aprovado' then public.descricao_logistica_pedido_loja(new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.instrucoes_retirada) ||
      case when new.codigo_retirada is not null then ' Código de retirada: ' || new.codigo_retirada || '.' else '' end
    when 'rejeitado' then '“' || coalesce(v_item_nome, 'Seu produto') || '” não foi aprovado. Consulte a justificativa.'
    else 'A entrega de “' || coalesce(v_item_nome, 'seu produto') || '” foi confirmada.' end;
  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  values (
    new.usuario_id, v_tipo,
    case new.status when 'aprovado' then public.titulo_logistica_pedido_loja(new.etapa_logistica) when 'rejeitado' then 'Resgate não aprovado' else 'Produto entregue' end,
    v_corpo,
    '/loja?aba=pedidos',
    jsonb_build_object('pedido_id', new.id, 'item_id', new.item_id, 'status', new.status, 'codigo_retirada', new.codigo_retirada, 'etapa_logistica', new.etapa_logistica),
    'loja:pedido:' || new.id::text || ':' || new.status
  ) on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  return new;
end;
$$;

create or replace function public.registrar_historico_status_pedido_loja()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo text;
  v_titulo text;
  v_descricao text;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status = 'aprovado' then
    v_tipo := case new.etapa_logistica when 'agendado' then 'agendado' when 'alinhamento_retirada' then 'alinhamento_retirada' else 'processado' end;
    v_titulo := public.titulo_logistica_pedido_loja(new.etapa_logistica);
    v_descricao := public.descricao_logistica_pedido_loja(new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.instrucoes_retirada);
  elsif new.status = 'rejeitado' then
    v_tipo := 'rejeitado'; v_titulo := 'Solicitação não aprovada'; v_descricao := coalesce(new.observacoes, 'A solicitação não foi aprovada.');
  elsif new.status = 'entregue' then
    v_tipo := 'entregue'; v_titulo := 'Entrega confirmada'; v_descricao := 'A entrega do seu resgate foi confirmada.';
  else return new;
  end if;
  insert into public.loja_pedido_historico (pedido_id, tipo, titulo, descricao, etapa_logistica, entrega_agendada_em, entrega_local, responsavel_id, ocorrido_em)
  values (new.id, v_tipo, v_titulo, v_descricao, new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.processado_por_admin_id, coalesce(new.processado_em, new.entregue_em, now()));
  return new;
end;
$$;

create or replace function public.registrar_historico_logistica_pedido_loja()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo text := case new.etapa_logistica when 'agendado' then 'agendado' when 'alinhamento_retirada' then 'alinhamento_retirada' else 'processado' end;
begin
  if old.status <> 'aprovado' or new.status <> 'aprovado' then return new; end if;
  if old.etapa_logistica is not distinct from new.etapa_logistica
     and old.entrega_agendada_em is not distinct from new.entrega_agendada_em
     and old.entrega_local is not distinct from new.entrega_local
     and old.instrucoes_retirada is not distinct from new.instrucoes_retirada then return new; end if;
  insert into public.loja_pedido_historico (pedido_id, tipo, titulo, descricao, etapa_logistica, entrega_agendada_em, entrega_local, responsavel_id, ocorrido_em)
  values (new.id, v_tipo, public.titulo_logistica_pedido_loja(new.etapa_logistica), public.descricao_logistica_pedido_loja(new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.instrucoes_retirada), new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.logistica_atualizada_por_id, coalesce(new.logistica_atualizada_em, now()));
  return new;
end;
$$;

create or replace function public.notificar_logistica_resgate_loja()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_evento_chave text;
begin
  if old.status <> 'aprovado' or new.status <> 'aprovado' then return new; end if;
  if old.etapa_logistica is not distinct from new.etapa_logistica
     and old.entrega_agendada_em is not distinct from new.entrega_agendada_em
     and old.entrega_local is not distinct from new.entrega_local
     and old.instrucoes_retirada is not distinct from new.instrucoes_retirada then return new; end if;
  v_evento_chave := 'loja:pedido:' || new.id::text || ':logistica:' || coalesce(new.logistica_atualizada_em, now())::text;
  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  values (
    new.usuario_id, 'loja_pedido_logistica_atualizada', public.titulo_logistica_pedido_loja(new.etapa_logistica),
    public.descricao_logistica_pedido_loja(new.etapa_logistica, new.entrega_agendada_em, new.entrega_local, new.instrucoes_retirada),
    '/loja?aba=pedidos',
    jsonb_build_object('pedido_id', new.id, 'etapa_logistica', new.etapa_logistica),
    v_evento_chave
  ) on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  return new;
end;
$$;

drop trigger if exists loja_pedido_registrar_status on public.loja_pedidos;
create trigger loja_pedido_registrar_status after update of status on public.loja_pedidos
for each row execute function public.registrar_historico_status_pedido_loja();
drop trigger if exists loja_pedido_registrar_logistica on public.loja_pedidos;
create trigger loja_pedido_registrar_logistica after update of etapa_logistica, entrega_agendada_em, entrega_local, instrucoes_retirada on public.loja_pedidos
for each row execute function public.registrar_historico_logistica_pedido_loja();
drop trigger if exists loja_pedido_notificar_logistica on public.loja_pedidos;
create trigger loja_pedido_notificar_logistica after update of etapa_logistica, entrega_agendada_em, entrega_local, instrucoes_retirada on public.loja_pedidos
for each row execute function public.notificar_logistica_resgate_loja();

insert into public.loja_pedido_historico (pedido_id, tipo, titulo, descricao, ocorrido_em)
select p.id, 'solicitado', 'Solicitação recebida', 'Seu resgate foi registrado e aguarda processamento.', p.solicitado_em
from public.loja_pedidos p
where not exists (select 1 from public.loja_pedido_historico h where h.pedido_id = p.id and h.tipo = 'solicitado');

insert into public.loja_pedido_historico (pedido_id, tipo, titulo, descricao, etapa_logistica, entrega_agendada_em, entrega_local, responsavel_id, ocorrido_em)
select p.id,
  case p.status when 'aprovado' then case p.etapa_logistica when 'agendado' then 'agendado' when 'alinhamento_retirada' then 'alinhamento_retirada' else 'processado' end when 'rejeitado' then 'rejeitado' else 'entregue' end,
  case p.status when 'aprovado' then public.titulo_logistica_pedido_loja(p.etapa_logistica) when 'rejeitado' then 'Solicitação não aprovada' else 'Entrega confirmada' end,
  case p.status when 'aprovado' then public.descricao_logistica_pedido_loja(p.etapa_logistica, p.entrega_agendada_em, p.entrega_local, p.instrucoes_retirada) when 'rejeitado' then coalesce(p.observacoes, 'A solicitação não foi aprovada.') else 'A entrega do seu resgate foi confirmada.' end,
  p.etapa_logistica, p.entrega_agendada_em, p.entrega_local, coalesce(p.logistica_atualizada_por_id, p.processado_por_admin_id, p.entregue_por_id), coalesce(p.entregue_em, p.processado_em, p.solicitado_em)
from public.loja_pedidos p
where p.status in ('aprovado', 'rejeitado', 'entregue')
  and not exists (select 1 from public.loja_pedido_historico h where h.pedido_id = p.id and h.tipo in ('processado', 'agendado', 'alinhamento_retirada', 'rejeitado', 'entregue'));
