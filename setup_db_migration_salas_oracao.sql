-- =========================================================
-- Migration: Salas de Oração (WebRTC/LiveKit) + finalização
-- =========================================================
-- Depende de: creditar_kesef (setup_db_migration_kesef_v2.sql)
-- Rode esta migration DEPOIS da do Kesef.

-- 1. Sala de oração
create table if not exists public.salas_oracao (
  id uuid primary key default gen_random_uuid(),
  tipo_sala text not null default 'livre' check (tipo_sala in ('dupla_aleatoria', 'circulo_semana', 'livre')),
  status_sala text not null default 'aguardando' check (status_sala in ('aguardando', 'ativa', 'encerrada')),
  host_usuario_id uuid not null references public.usuarios(id),
  livekit_room_name text not null unique,
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 2. Participantes de cada sala
create table if not exists public.salas_oracao_participantes (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas_oracao(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id),
  conectado_em timestamptz not null default now(),
  desconectado_em timestamptz,
  kesef_creditado boolean not null default false,
  unique (sala_id, usuario_id)
);

create index if not exists idx_salas_status on public.salas_oracao(status_sala);
create index if not exists idx_participantes_sala on public.salas_oracao_participantes(sala_id);

-- 3. Criar uma sala (com anti-spam: 1 sala ativa por usuário + cooldown 30s)
create or replace function public.criar_sala_oracao(
  p_tipo_sala text default 'livre'
) returns public.salas_oracao
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_sala public.salas_oracao;
  v_ultima_sala public.salas_oracao;
  v_cooldown constant interval := interval '30 seconds';
begin
  -- 1. Se já tem sala aguardando/ativa, retorna ela (não cria outra)
  select * into v_sala
  from public.salas_oracao
  where host_usuario_id = v_usuario_id
    and status_sala in ('aguardando', 'ativa')
  order by criado_em desc
  limit 1;

  if found then
    return v_sala;
  end if;

  -- 2. Cooldown: se finalizou uma sala há menos de 30s, bloqueia
  select * into v_ultima_sala
  from public.salas_oracao
  where host_usuario_id = v_usuario_id
    and status_sala = 'encerrada'
  order by encerrada_em desc
  limit 1;

  if found and (now() - v_ultima_sala.encerrada_em) < v_cooldown then
    raise exception 'AGUARDE_COOLDOWN'
      using hint = 'Aguardar 30 segundos entre orações';
  end if;

  insert into public.salas_oracao (tipo_sala, host_usuario_id, livekit_room_name, status_sala)
  values (p_tipo_sala, v_usuario_id, 'oracao_' || replace(gen_random_uuid()::text, '-', ''), 'aguardando')
  returning * into v_sala;

  insert into public.salas_oracao_participantes (sala_id, usuario_id)
  values (v_sala.id, v_usuario_id);

  return v_sala;
end;
$$;

-- 4. Entrar numa sala
create or replace function public.entrar_sala_oracao(
  p_sala_id uuid
) returns public.salas_oracao
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_sala public.salas_oracao;
  v_total_participantes integer;
begin
  select * into v_sala from public.salas_oracao where id = p_sala_id for update;

  if not found then
    raise exception 'SALA_NAO_ENCONTRADA';
  end if;

  if v_sala.status_sala = 'encerrada' then
    raise exception 'SALA_JA_ENCERRADA';
  end if;

  insert into public.salas_oracao_participantes (sala_id, usuario_id)
  values (p_sala_id, v_usuario_id)
  on conflict (sala_id, usuario_id) do update set desconectado_em = null;

  select count(*) into v_total_participantes
  from public.salas_oracao_participantes
  where sala_id = p_sala_id and desconectado_em is null;

  if v_total_participantes >= 2 and v_sala.status_sala = 'aguardando' then
    update public.salas_oracao
    set status_sala = 'ativa', iniciada_em = now()
    where id = p_sala_id
    returning * into v_sala;
  end if;

  return v_sala;
end;
$$;

-- 5. Finalizar a sala ("Amém") — credita Kesef para ambos os participantes
create or replace function public.finalizar_sala_oracao(
  p_sala_id uuid
) returns table (usuario_id uuid, creditado boolean, motivo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sala public.salas_oracao;
  v_duracao_segundos integer;
  v_duracao_minima constant integer := 60;
  v_participante record;
begin
  select * into v_sala from public.salas_oracao where id = p_sala_id for update;

  if not found then
    raise exception 'SALA_NAO_ENCONTRADA';
  end if;

  if v_sala.status_sala = 'encerrada' then
    return;
  end if;

  v_duracao_segundos := coalesce(extract(epoch from (now() - v_sala.iniciada_em))::integer, 0);

  update public.salas_oracao
  set status_sala = 'encerrada', encerrada_em = now()
  where id = p_sala_id;

  update public.salas_oracao_participantes
  set desconectado_em = now()
  where sala_id = p_sala_id and desconectado_em is null;

  for v_participante in
    select * from public.salas_oracao_participantes where sala_id = p_sala_id
  loop
    if v_sala.iniciada_em is null then
      usuario_id := v_participante.usuario_id;
      creditado := false;
      motivo := 'SALA_NUNCA_FICOU_ATIVA';
      return next;
      continue;
    end if;

    if v_duracao_segundos < v_duracao_minima then
      usuario_id := v_participante.usuario_id;
      creditado := false;
      motivo := 'DURACAO_INSUFICIENTE';
      return next;
      continue;
    end if;

    begin
      perform public.creditar_kesef(v_participante.usuario_id, 'oracao', 10, p_sala_id);

      update public.salas_oracao_participantes
      set kesef_creditado = true
      where sala_id = p_sala_id and usuario_id = v_participante.usuario_id;

      usuario_id := v_participante.usuario_id;
      creditado := true;
      motivo := 'OK';
      return next;
    exception when others then
      usuario_id := v_participante.usuario_id;
      creditado := false;
      motivo := sqlerrm;
      return next;
    end;
  end loop;
end;
$$;

-- 6. RLS
alter table public.salas_oracao enable row level security;
alter table public.salas_oracao_participantes enable row level security;

create policy "usuarios_veem_salas_que_participam"
  on public.salas_oracao for select
  using (
    id in (select sala_id from public.salas_oracao_participantes where usuario_id = auth.uid())
  );

create policy "usuarios_veem_salas_aguardando"
  on public.salas_oracao for select
  using (status_sala = 'aguardando');

create policy "usuarios_veem_proprias_participacoes"
  on public.salas_oracao_participantes for select
  using (usuario_id = auth.uid());

-- RPCs são security definer, então não precisam de policies INSERT/UPDATE explícitas
