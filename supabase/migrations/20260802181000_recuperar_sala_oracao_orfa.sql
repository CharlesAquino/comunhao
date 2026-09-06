create or replace function public.liberar_salas_oracao_do_usuario(p_usuario_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salas uuid[];
  v_quantidade integer := 0;
begin
  with desconectadas as (
    update public.salas_oracao_participantes participante
    set desconectado_em = now()
    from public.salas_oracao sala
    where participante.sala_id = sala.id
      and participante.usuario_id = p_usuario_id
      and participante.desconectado_em is null
      and sala.status_sala in ('aguardando', 'ativa')
    returning participante.sala_id
  )
  select coalesce(array_agg(distinct sala_id), array[]::uuid[]), count(*)
  into v_salas, v_quantidade
  from desconectadas;

  update public.salas_oracao sala
  set status_sala = 'encerrada', encerrada_em = coalesce(encerrada_em, now())
  where sala.id = any(v_salas)
    and not exists (
      select 1
      from public.salas_oracao_participantes participante
      where participante.sala_id = sala.id
        and participante.desconectado_em is null
    );

  return v_quantidade;
end;
$$;

revoke all on function public.liberar_salas_oracao_do_usuario(uuid) from public;
revoke all on function public.liberar_salas_oracao_do_usuario(uuid) from anon;
revoke all on function public.liberar_salas_oracao_do_usuario(uuid) from authenticated;

create or replace function public.enviar_convite_oracao(
  p_destinatario_id uuid,
  p_tipo_conexao text default 'voz'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_remetente_id uuid;
  v_convite_id uuid;
begin
  v_remetente_id := public.usuario_atual_id();

  if v_remetente_id is null then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;
  if p_destinatario_id is null then raise exception 'DUPLA_NAO_DEFINIDA'; end if;
  if p_destinatario_id = v_remetente_id then raise exception 'CONVITE_PARA_SI_MESMO'; end if;
  if p_tipo_conexao not in ('aceite', 'voz', 'video') then raise exception 'TIPO_CONEXAO_INVALIDO'; end if;
  if not exists (select 1 from public.usuarios where id = p_destinatario_id) then
    raise exception 'DESTINATARIO_NAO_ENCONTRADO';
  end if;

  select id into v_convite_id
  from public.convites_oracao
  where remetente_id = v_remetente_id
    and destinatario_id = p_destinatario_id
    and status = 'pendente'
  order by criado_em desc
  limit 1;
  if v_convite_id is not null then return v_convite_id; end if;

  if exists (
    select 1 from public.convites_oracao
    where remetente_id = p_destinatario_id
      and destinatario_id = v_remetente_id
      and status = 'pendente'
  ) then
    raise exception 'CONVITE_RECEBIDO_PENDENTE';
  end if;

  -- Estar na Home e iniciar um novo convite é uma intenção explícita de sair
  -- de qualquer sala anterior. A limpeza não concede recompensas.
  perform public.liberar_salas_oracao_do_usuario(v_remetente_id);

  insert into public.convites_oracao (
    remetente_id, destinatario_id, tipo_conexao_remetente
  ) values (
    v_remetente_id, p_destinatario_id, p_tipo_conexao
  )
  returning id into v_convite_id;

  return v_convite_id;
exception
  when unique_violation then
    select id into v_convite_id
    from public.convites_oracao
    where remetente_id = v_remetente_id and status = 'pendente'
    order by criado_em desc
    limit 1;
    if v_convite_id is not null then return v_convite_id; end if;
    raise;
end;
$$;

revoke all on function public.enviar_convite_oracao(uuid, text) from public;
revoke all on function public.enviar_convite_oracao(uuid, text) from anon;
grant execute on function public.enviar_convite_oracao(uuid, text) to authenticated;
