-- Contratos aditivos para notificações, jornada de oração, Tesouro e EBD.

-- Preferências de notificação por membro.
create table if not exists public.notificacao_preferencias (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  oracao boolean not null default true,
  mensagens boolean not null default true,
  dupla_semanal boolean not null default true,
  tesouro boolean not null default true,
  ebd boolean not null default true,
  comunidade boolean not null default true,
  silencio_ativo boolean not null default false,
  silencio_inicio time not null default '22:00',
  silencio_fim time not null default '07:00',
  fuso_horario text not null default 'America/Sao_Paulo',
  atualizado_em timestamptz not null default now()
);

alter table public.notificacao_preferencias enable row level security;
drop policy if exists notificacao_preferencias_proprias on public.notificacao_preferencias;
create policy notificacao_preferencias_proprias
on public.notificacao_preferencias for all to authenticated
using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());
grant select, insert, update on public.notificacao_preferencias to authenticated;

create or replace function public.obter_preferencias_notificacao()
returns public.notificacao_preferencias
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.usuario_atual_id();
  v_result public.notificacao_preferencias;
begin
  if v_user is null then raise exception 'USER_PROFILE_NOT_LINKED'; end if;
  insert into public.notificacao_preferencias (usuario_id)
  values (v_user)
  on conflict (usuario_id) do nothing;
  select * into v_result from public.notificacao_preferencias
  where usuario_id = v_user;
  return v_result;
end;
$$;

create or replace function public.salvar_preferencias_notificacao(p_preferencias jsonb)
returns public.notificacao_preferencias
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := public.usuario_atual_id(); v_result public.notificacao_preferencias;
begin
  if v_user is null then raise exception 'USER_PROFILE_NOT_LINKED'; end if;
  insert into public.notificacao_preferencias (
    usuario_id, oracao, mensagens, dupla_semanal, tesouro, ebd, comunidade,
    silencio_ativo, silencio_inicio, silencio_fim, fuso_horario, atualizado_em
  ) values (
    v_user,
    coalesce((p_preferencias->>'oracao')::boolean, true),
    coalesce((p_preferencias->>'mensagens')::boolean, true),
    coalesce((p_preferencias->>'dupla_semanal')::boolean, true),
    coalesce((p_preferencias->>'tesouro')::boolean, true),
    coalesce((p_preferencias->>'ebd')::boolean, true),
    coalesce((p_preferencias->>'comunidade')::boolean, true),
    coalesce((p_preferencias->>'silencio_ativo')::boolean, false),
    coalesce((p_preferencias->>'silencio_inicio')::time, '22:00'::time),
    coalesce((p_preferencias->>'silencio_fim')::time, '07:00'::time),
    left(coalesce(nullif(p_preferencias->>'fuso_horario', ''), 'America/Sao_Paulo'), 80),
    now()
  ) on conflict (usuario_id) do update set
    oracao = excluded.oracao, mensagens = excluded.mensagens,
    dupla_semanal = excluded.dupla_semanal, tesouro = excluded.tesouro,
    ebd = excluded.ebd, comunidade = excluded.comunidade,
    silencio_ativo = excluded.silencio_ativo,
    silencio_inicio = excluded.silencio_inicio, silencio_fim = excluded.silencio_fim,
    fuso_horario = excluded.fuso_horario, atualizado_em = now()
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.obter_preferencias_notificacao() from public, anon;
grant execute on function public.obter_preferencias_notificacao() to authenticated;
revoke all on function public.salvar_preferencias_notificacao(jsonb) from public, anon;
grant execute on function public.salvar_preferencias_notificacao(jsonb) to authenticated;

-- Estado privado e recuperável da jornada de oração por participante.
create table if not exists public.oracao_jornadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  origem text not null check (origem in ('convite', 'mao_levantada', 'sala_aberta')),
  referencia_id uuid not null,
  modalidade text not null check (modalidade in ('texto', 'silencio', 'voz', 'video')),
  status text not null default 'preparando'
    check (status in ('preparando', 'aguardando', 'orando', 'interrompida', 'concluida', 'cancelada')),
  intencao_privada text check (char_length(intencao_privada) <= 1000),
  etapa text not null default 'necessidade'
    check (etapa in ('necessidade', 'convite', 'aceite', 'oracao', 'encerramento', 'acompanhamento')),
  iniciada_em timestamptz,
  ultimo_sinal_em timestamptz not null default now(),
  concluida_em timestamptz,
  acompanhamento_em timestamptz,
  acompanhamento_status text check (acompanhamento_status in ('pendente', 'bem', 'precisa_apoio', 'dispensado')),
  acompanhamento_nota text check (char_length(acompanhamento_nota) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, origem, referencia_id)
);

create index if not exists oracao_jornadas_retomada_idx
on public.oracao_jornadas (usuario_id, atualizado_em desc)
where status in ('preparando', 'aguardando', 'orando', 'interrompida');

alter table public.oracao_jornadas enable row level security;
drop policy if exists oracao_jornadas_privadas on public.oracao_jornadas;
create policy oracao_jornadas_privadas
on public.oracao_jornadas for all to authenticated
using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());
grant select, insert, update on public.oracao_jornadas to authenticated;

-- Catálogo por variantes/SKU, galeria temática e rastreabilidade de estoque.
alter table public.loja_itens
  add column if not exists estado text not null default 'ativo',
  add column if not exists limite_por_membro integer,
  add column if not exists retirada_instrucao text,
  add column if not exists retirada_previsao text;

alter table public.loja_itens drop constraint if exists loja_itens_estado_check;
alter table public.loja_itens add constraint loja_itens_estado_check
  check (estado in ('ativo', 'pausado', 'arquivado'));

create table if not exists public.loja_variantes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.loja_itens(id) on delete cascade,
  sku text not null unique,
  nome text not null,
  atributos jsonb not null default '{}'::jsonb,
  estoque integer not null default 0 check (estoque >= 0),
  estoque_alerta integer not null default 2 check (estoque_alerta >= 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists loja_variantes_item_idx on public.loja_variantes(item_id, ativo, ordem);

create table if not exists public.loja_item_imagens (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.loja_itens(id) on delete cascade,
  tema text not null check (tema in ('claro', 'escuro')),
  url text not null,
  texto_alternativo text not null default '',
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (item_id, tema, ordem)
);

alter table public.loja_pedidos
  add column if not exists variante_id uuid references public.loja_variantes(id) on delete restrict,
  add column if not exists codigo_retirada text,
  add column if not exists reservado_em timestamptz,
  add column if not exists reserva_expira_em timestamptz,
  add column if not exists entregue_em timestamptz,
  add column if not exists entregue_por_id uuid references public.usuarios(id) on delete set null;

create unique index if not exists loja_pedidos_codigo_retirada_unique
on public.loja_pedidos(codigo_retirada) where codigo_retirada is not null;

create table if not exists public.loja_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.loja_itens(id) on delete restrict,
  variante_id uuid references public.loja_variantes(id) on delete restrict,
  pedido_id uuid references public.loja_pedidos(id) on delete set null,
  quantidade integer not null check (quantidade <> 0),
  tipo text not null check (tipo in ('entrada', 'reserva', 'liberacao', 'baixa', 'ajuste')),
  saldo_anterior integer,
  saldo_posterior integer,
  responsavel_id uuid references public.usuarios(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now()
);

alter table public.loja_variantes enable row level security;
alter table public.loja_item_imagens enable row level security;
alter table public.loja_estoque_movimentos enable row level security;

drop policy if exists loja_variantes_leitura on public.loja_variantes;
create policy loja_variantes_leitura on public.loja_variantes for select to authenticated
using (ativo = true or public.admin_tem_permissao('store.manage'));
drop policy if exists loja_variantes_admin on public.loja_variantes;
create policy loja_variantes_admin on public.loja_variantes for all to authenticated
using (public.admin_tem_permissao('store.manage')) with check (public.admin_tem_permissao('store.manage'));
drop policy if exists loja_item_imagens_leitura on public.loja_item_imagens;
create policy loja_item_imagens_leitura on public.loja_item_imagens for select to authenticated
using (ativo = true or public.admin_tem_permissao('store.manage'));
drop policy if exists loja_item_imagens_admin on public.loja_item_imagens;
create policy loja_item_imagens_admin on public.loja_item_imagens for all to authenticated
using (public.admin_tem_permissao('store.manage')) with check (public.admin_tem_permissao('store.manage'));
drop policy if exists loja_estoque_movimentos_admin on public.loja_estoque_movimentos;
create policy loja_estoque_movimentos_admin on public.loja_estoque_movimentos for select to authenticated
using (public.admin_tem_permissao('store.read'));

grant select on public.loja_variantes, public.loja_item_imagens to authenticated;
grant select, insert, update, delete on public.loja_variantes, public.loja_item_imagens to authenticated;
grant select on public.loja_estoque_movimentos to authenticated;

drop function if exists public.solicitar_resgate_loja(uuid, integer, uuid);
create function public.solicitar_resgate_loja(
  p_item_id uuid,
  p_quantidade integer default 1,
  p_chave_idempotencia uuid default null,
  p_variante_id uuid default null
)
returns public.loja_pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_item public.loja_itens;
  v_variante public.loja_variantes;
  v_existente public.loja_pedidos;
  v_pedido public.loja_pedidos;
  v_saldo integer;
  v_resgates_anteriores integer;
begin
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_quantidade is null or p_quantidade <= 0 or p_quantidade > 10 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  if p_chave_idempotencia is not null then
    select p.* into v_existente from public.loja_pedidos p
    where p.usuario_id = v_usuario_id and p.idempotencia_chave = p_chave_idempotencia limit 1;
    if v_existente.id is not null then return v_existente; end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_usuario_id::text || ':' || p_item_id::text, 0));
  select i.* into v_item from public.loja_itens i
  where i.id = p_item_id and i.ativo = true and i.estado = 'ativo' for share;
  if v_item.id is null then raise exception 'ITEM_INDISPONIVEL'; end if;

  if exists (select 1 from public.loja_variantes v where v.item_id = p_item_id and v.ativo) then
    if p_variante_id is null then raise exception 'VARIANTE_OBRIGATORIA'; end if;
    select v.* into v_variante from public.loja_variantes v
    where v.id = p_variante_id and v.item_id = p_item_id and v.ativo for share;
    if v_variante.id is null then raise exception 'VARIANTE_INVALIDA'; end if;
    if v_variante.estoque < p_quantidade then raise exception 'ESTOQUE_INSUFICIENTE'; end if;
  elsif v_item.estoque < p_quantidade then
    raise exception 'ESTOQUE_INSUFICIENTE';
  end if;

  if exists (select 1 from public.loja_pedidos p where p.usuario_id = v_usuario_id and p.item_id = p_item_id and p.status = 'pendente') then
    raise exception 'PEDIDO_PENDENTE_EXISTENTE';
  end if;
  select coalesce(sum(p.quantidade), 0)::integer into v_resgates_anteriores
  from public.loja_pedidos p where p.usuario_id = v_usuario_id and p.item_id = p_item_id
    and p.status in ('aprovado', 'entregue');
  if v_item.limite_por_membro is not null
     and v_resgates_anteriores + p_quantidade > v_item.limite_por_membro then
    raise exception 'LIMITE_POR_MEMBRO_ATINGIDO';
  end if;

  select coalesce(sum(k.quantidade), 0)::integer into v_saldo
  from public.kesef_ledger k where k.usuario_id = v_usuario_id;
  if v_saldo < v_item.preco_kesef * p_quantidade then raise exception 'SALDO_INSUFICIENTE'; end if;

  insert into public.loja_pedidos (
    usuario_id, item_id, variante_id, quantidade, kesef_debitado, idempotencia_chave
  ) values (
    v_usuario_id, p_item_id, p_variante_id, p_quantidade,
    v_item.preco_kesef * p_quantidade, p_chave_idempotencia
  ) returning * into v_pedido;
  return v_pedido;
end;
$$;
revoke all on function public.solicitar_resgate_loja(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.solicitar_resgate_loja(uuid, integer, uuid, uuid) to authenticated;

create or replace function public.admin_processar_pedido_loja(
  p_pedido_id uuid, p_novo_status text, p_observacoes text default null
)
returns public.loja_pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin_id uuid := public.usuario_atual_id();
  v_pedido public.loja_pedidos;
  v_resultado public.loja_pedidos;
  v_saldo_anterior integer;
begin
  if not public.admin_tem_permissao('store.manage') then raise exception 'PERMISSAO_NEGADA'; end if;
  select p.* into v_pedido from public.loja_pedidos p where p.id = p_pedido_id for update;
  if v_pedido.id is null then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;

  if p_novo_status = 'aprovado' then
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
  elsif p_novo_status = 'rejeitado' then
    if v_pedido.status <> 'pendente' then raise exception 'TRANSICAO_INVALIDA'; end if;
    if nullif(btrim(coalesce(p_observacoes, '')), '') is null then raise exception 'MOTIVO_REJEICAO_OBRIGATORIO'; end if;
  elsif p_novo_status = 'entregue' then
    if v_pedido.status <> 'aprovado' then raise exception 'TRANSICAO_INVALIDA'; end if;
  else raise exception 'STATUS_INVALIDO';
  end if;

  update public.loja_pedidos set
    status = p_novo_status,
    observacoes = coalesce(nullif(btrim(p_observacoes), ''), observacoes),
    processado_por_admin_id = v_admin_id,
    processado_em = now(),
    codigo_retirada = case when p_novo_status = 'aprovado' then upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) else codigo_retirada end,
    reservado_em = case when p_novo_status = 'aprovado' then now() else reservado_em end,
    entregue_em = case when p_novo_status = 'entregue' then now() else entregue_em end,
    entregue_por_id = case when p_novo_status = 'entregue' then v_admin_id else entregue_por_id end
  where id = p_pedido_id returning * into v_resultado;

  insert into public.admin_audit_log (actor_user_id, permission, action, entity_type, entity_id, before_data, after_data, reason)
  values (v_admin_id, 'store.manage', 'store.order.status_changed', 'loja_pedidos', p_pedido_id::text,
          to_jsonb(v_pedido), to_jsonb(v_resultado), p_observacoes);
  return v_resultado;
end;
$$;

-- Progresso sincronizado e respostas reflexivas privadas da EBD.
create table if not exists public.ebd_progresso_usuario (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  licao_id text not null references public.ebd_editorial_lessons(id) on delete cascade,
  versao integer not null check (versao >= 0),
  dia_atual_id text,
  bloco_atual_id text,
  blocos_concluidos text[] not null default '{}',
  dias_recompensados text[] not null default '{}',
  quizzes_recompensados text[] not null default '{}',
  respostas_privadas jsonb not null default '{}'::jsonb,
  iniciado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz,
  primary key (usuario_id, licao_id, versao)
);

alter table public.ebd_progresso_usuario enable row level security;
drop policy if exists ebd_progresso_privado on public.ebd_progresso_usuario;
create policy ebd_progresso_privado on public.ebd_progresso_usuario for all to authenticated
using (usuario_id = public.usuario_atual_id())
with check (usuario_id = public.usuario_atual_id());
grant select, insert, update on public.ebd_progresso_usuario to authenticated;

create or replace function public.ebd_metricas_editoriais(p_lesson_id text, p_version integer)
returns table (iniciaram bigint, concluiram bigint, taxa_conclusao numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('ebd.read') then raise exception 'ADMIN_PERMISSION_REQUIRED'; end if;
  return query
  select count(*)::bigint,
         count(*) filter (where p.concluido_em is not null)::bigint,
         case when count(*) = 0 then 0::numeric
              else round((count(*) filter (where p.concluido_em is not null))::numeric * 100 / count(*), 1)
         end
  from public.ebd_progresso_usuario p
  where p.licao_id = p_lesson_id and p.versao = p_version;
end;
$$;

revoke all on function public.ebd_metricas_editoriais(text, integer) from public, anon;
grant execute on function public.ebd_metricas_editoriais(text, integer) to authenticated;

-- Eventos operacionais que alimentam sino, Realtime e push pelo mesmo registro idempotente.
create or replace function public.notificar_status_resgate_loja()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_item_nome text;
  v_tipo text;
begin
  if old.status is not distinct from new.status or new.status not in ('aprovado', 'rejeitado', 'entregue') then return new; end if;
  select nome into v_item_nome from public.loja_itens where id = new.item_id;
  v_tipo := case new.status
    when 'aprovado' then 'loja_pedido_aprovado'
    when 'rejeitado' then 'loja_pedido_rejeitado'
    else 'loja_pedido_entregue' end;
  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  values (
    new.usuario_id, v_tipo,
    case new.status when 'aprovado' then 'Resgate aprovado' when 'rejeitado' then 'Resgate não aprovado' else 'Produto entregue' end,
    case new.status
      when 'aprovado' then '“' || coalesce(v_item_nome, 'Seu produto') || '” foi reservado. Código: ' || coalesce(new.codigo_retirada, '')
      when 'rejeitado' then '“' || coalesce(v_item_nome, 'Seu produto') || '” não foi aprovado. Consulte a justificativa.'
      else 'A entrega de “' || coalesce(v_item_nome, 'seu produto') || '” foi confirmada.' end,
    '/loja?aba=pedidos',
    jsonb_build_object('pedido_id', new.id, 'item_id', new.item_id, 'status', new.status, 'codigo_retirada', new.codigo_retirada),
    'loja:pedido:' || new.id::text || ':' || new.status
  ) on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  return new;
end;
$$;
drop trigger if exists loja_pedido_notificar_status on public.loja_pedidos;
create trigger loja_pedido_notificar_status after update of status on public.loja_pedidos
for each row execute function public.notificar_status_resgate_loja();

create or replace function public.notificar_convite_oracao_expirado()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'pendente' and new.status = 'expirado' then
    insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
    values
      (new.remetente_id, 'convite_expirado', 'Convite expirado', 'O convite para oração expirou sem resposta.', '/', jsonb_build_object('convite_id', new.id), 'convite:' || new.id::text || ':expirado:remetente'),
      (new.destinatario_id, 'convite_expirado', 'Convite expirado', 'Um convite para oração expirou.', '/', jsonb_build_object('convite_id', new.id), 'convite:' || new.id::text || ':expirado:destinatario')
    on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists convite_oracao_notificar_expiracao on public.convites_oracao;
create trigger convite_oracao_notificar_expiracao after update of status on public.convites_oracao
for each row execute function public.notificar_convite_oracao_expirado();
