-- =========================================================
-- Migration: Sistema de Indicação + Bônus por expansão
-- =========================================================
-- 1. Remove anti-spam de criar_sala_oracao (oração nunca é bloqueada)
-- 2. Adiciona colunas de indicação em usuarios
-- 3. finalizar_sala_oracao: credita apenas se NÃO for dupla da semana
-- 4. Geração de código de indicação

-- 1. Criar sala SEM anti-spam (sempre disponível)
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
begin
  insert into public.salas_oracao (tipo_sala, host_usuario_id, livekit_room_name, status_sala)
  values (p_tipo_sala, v_usuario_id, 'oracao_' || replace(gen_random_uuid()::text, '-', ''), 'aguardando')
  returning * into v_sala;

  insert into public.salas_oracao_participantes (sala_id, usuario_id)
  values (v_sala.id, v_usuario_id);

  return v_sala;
end;
$$;

-- 2. Colunas de indicação em usuarios
alter table public.usuarios
  add column if not exists codigo_indicacao text unique,
  add column if not exists indicado_por_id uuid references public.usuarios(id);

create index if not exists idx_usuarios_codigo_indicacao on public.usuarios(codigo_indicacao);

-- 3. Gerar código de indicação para um usuário
create or replace function public.gerar_codigo_indicacao()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_codigo text;
  v_existe boolean;
begin
  -- Se já tem código, retorna ele
  select codigo_indicacao into v_codigo
  from public.usuarios where id = v_usuario_id;

  if found and v_codigo is not null then
    return v_codigo;
  end if;

  -- Gera código único de 8 caracteres
  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(select 1 from public.usuarios where codigo_indicacao = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;

  update public.usuarios set codigo_indicacao = v_codigo where id = v_usuario_id;
  return v_codigo;
end;
$$;

-- 4. Registrar indicação (chamado no cadastro)
create or replace function public.registrar_indicacao(
  p_codigo_indicacao text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_indicador_id uuid;
begin
  select id into v_indicador_id
  from public.usuarios
  where codigo_indicacao = p_codigo_indicacao;

  if not found then
    raise exception 'CODIGO_INVALIDO';
  end if;

  if v_indicador_id = v_usuario_id then
    raise exception 'AUTO_INDICACAO';
  end if;

  update public.usuarios
  set indicado_por_id = v_indicador_id
  where id = v_usuario_id;
end;
$$;

-- 5. Creditar bônus de indicação (chamado quando indicado completa 1ª oração)
create or replace function public.creditar_bonus_indicacao()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_indicador_id uuid;
begin
  select indicado_por_id into v_indicador_id
  from public.usuarios where id = v_usuario_id;

  if not found or v_indicador_id is null then
    return;
  end if;

  -- Evita duplicidade: verifica se já recebeu bônus por esta indicação
  if exists (
    select 1 from public.kesef_ledger
    where usuario_id = v_indicador_id
      and tipo = 'indicacao'
      and referencia = v_usuario_id::text
  ) then
    return;
  end if;

  perform public.creditar_kesef(v_indicador_id, 'indicacao', 20, v_usuario_id::text);
end;
$$;

-- 6. finalizar_sala_oracao: credita apenas se orar com alguém FORA da dupla
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
  v_outro_participante record;
  v_eh_dupla boolean;
  v_primeira_oracao boolean;
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
    -- Duração mínima
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

    -- Verifica se o outro participante é a dupla da semana
    v_eh_dupla := false;
    for v_outro_participante in
      select * from public.salas_oracao_participantes
      where sala_id = p_sala_id and usuario_id <> v_participante.usuario_id
    loop
      if exists (
        select 1 from public.usuarios
        where id = v_participante.usuario_id
          and orando_por_id = v_outro_participante.usuario_id
      ) then
        v_eh_dupla := true;
        exit;
      end if;
    end loop;

    if v_eh_dupla then
      -- Dupla da semana: não ganha moedas (já é compromisso)
      usuario_id := v_participante.usuario_id;
      creditado := false;
      motivo := 'DUPLA_DA_SEMANA';
      return next;
      continue;
    end if;

    -- Fora da dupla: credita Kesef
    begin
      perform public.creditar_kesef(v_participante.usuario_id, 'oracao', 10, p_sala_id);

      update public.salas_oracao_participantes
      set kesef_creditado = true
      where sala_id = p_sala_id and usuario_id = v_participante.usuario_id;

      -- Se foi indicado por alguém e é a 1ª oração, credita bônus
      perform public.creditar_bonus_indicacao();

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
