-- Corrige as cinco funções legadas apontadas pelo lint remoto depois do
-- hardening anti-IDOR. Endpoints obsoletos e sem consumidores são removidos;
-- endpoints ativos mantêm a assinatura pública com escopo de acesso reduzido.

-- Obsoleta: depende de colunas removidas (device_id) e não satisfaz mais o
-- contrato atual de cadastro (username obrigatório). O app não consome a RPC.
drop function if exists public.criar_perfil_usuario(text, text, text);

-- Obsoleta: o apoio atual é representado por intercessões no Mural Social;
-- public.pedidos.quantidade_apoios não existe e não há consumidor da RPC.
drop function if exists public.incrementar_apoio_oracao(uuid);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.usuario_atual_e_admin()
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.finalizar_sala_oracao(p_sala_id uuid)
returns table(usuario_id uuid, creditado boolean, motivo text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_sala public.salas_oracao;
  v_duracao_segundos integer;
  v_duracao_minima constant integer := 60;
  v_participante record;
  v_outro_participante record;
  v_eh_dupla boolean;
begin
  if v_actor is null then
    raise exception 'USUARIO_NAO_AUTENTICADO' using errcode = '42501';
  end if;

  select s.*
  into v_sala
  from public.salas_oracao s
  where s.id = p_sala_id
  for update;

  if not found then
    raise exception 'SALA_NAO_ENCONTRADA';
  end if;

  if v_sala.host_usuario_id is distinct from v_actor
     and not exists (
       select 1
       from public.salas_oracao_participantes sap
       where sap.sala_id = p_sala_id
         and sap.usuario_id = v_actor
     )
     and not public.admin_tem_permissao('prayer.manage') then
    raise exception 'PERMISSAO_NEGADA' using errcode = '42501';
  end if;

  if v_sala.status_sala = 'encerrada' then
    return;
  end if;

  v_duracao_segundos := coalesce(
    extract(epoch from (pg_catalog.now() - v_sala.iniciada_em))::integer,
    0
  );

  update public.salas_oracao s
  set status_sala = 'encerrada',
      encerrada_em = pg_catalog.now()
  where s.id = p_sala_id;

  update public.salas_oracao_participantes sap
  set desconectado_em = pg_catalog.now()
  where sap.sala_id = p_sala_id
    and sap.desconectado_em is null;

  for v_participante in
    select sap.*
    from public.salas_oracao_participantes sap
    where sap.sala_id = p_sala_id
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

    v_eh_dupla := false;
    for v_outro_participante in
      select sap.*
      from public.salas_oracao_participantes sap
      where sap.sala_id = p_sala_id
        and sap.usuario_id <> v_participante.usuario_id
    loop
      if exists (
        select 1
        from public.usuarios u
        where u.id = v_participante.usuario_id
          and u.orando_por_id = v_outro_participante.usuario_id
      ) then
        v_eh_dupla := true;
        exit;
      end if;
    end loop;

    if v_eh_dupla then
      begin
        perform public.creditar_xp(v_participante.usuario_id, 5, p_sala_id::text);
        usuario_id := v_participante.usuario_id;
        creditado := true;
        motivo := 'DUPLA_DA_SEMANA_XP';
        return next;
        continue;
      exception when others then
        usuario_id := v_participante.usuario_id;
        creditado := false;
        motivo := sqlerrm;
        return next;
        continue;
      end;
    end if;

    begin
      perform public.creditar_kesef(v_participante.usuario_id, 'oracao', 10, p_sala_id);
      perform public.creditar_xp(v_participante.usuario_id, 5, p_sala_id::text);

      update public.salas_oracao_participantes sap
      set kesef_creditado = true
      where sap.sala_id = p_sala_id
        and sap.usuario_id = v_participante.usuario_id;

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

revoke all on function public.finalizar_sala_oracao(uuid) from public, anon;
grant execute on function public.finalizar_sala_oracao(uuid) to authenticated, service_role;

create or replace function public.verificar_provas_pendentes(p_usuario_id uuid default null)
returns table(prova_id uuid, concluida boolean, tier_alvo text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_alvo uuid;
  v_prova record;
  v_result record;
  v_encontrou boolean := false;
begin
  if v_actor is null then
    raise exception 'USUARIO_NAO_AUTENTICADO' using errcode = '42501';
  end if;

  v_alvo := coalesce(p_usuario_id, v_actor);
  if v_alvo is distinct from v_actor then
    raise exception 'PERMISSAO_NEGADA' using errcode = '42501';
  end if;

  for v_prova in
    select pa.*
    from public.provas_ascensao pa
    where pa.status = 'ativa'
      and pa.usuario_id = v_alvo
  loop
    v_encontrou := true;

    select vpa.*
    into v_result
    from public.verificar_prova_ascensao(v_prova.id) vpa;

    prova_id := v_prova.id;
    concluida := v_result.concluida;
    tier_alvo := v_prova.tier_alvo;
    status := case when v_result.concluida then 'completa' else 'em_andamento' end;
    return next;
  end loop;

  if not v_encontrou then
    prova_id := null;
    concluida := false;
    tier_alvo := null;
    status := 'sem_prova';
    return next;
  end if;
end;
$$;

revoke all on function public.verificar_provas_pendentes(uuid) from public, anon;
grant execute on function public.verificar_provas_pendentes(uuid) to authenticated, service_role;

-- A função interna promove usuário e altera XP. A chamada pública direta
-- permitiria contornar o escopo imposto pelo wrapper acima.
revoke all on function public.verificar_prova_ascensao(uuid) from public, anon, authenticated;
grant execute on function public.verificar_prova_ascensao(uuid) to service_role;
