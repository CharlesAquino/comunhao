-- Torna o envio de convite idempotente e corrige bloqueios causados por
-- participações históricas. A interface possui um único convite enviado ativo
-- por pessoa, portanto consolidamos eventuais duplicidades legadas.

with duplicados as (
  select id,
         row_number() over (partition by remetente_id order by criado_em desc, id desc) as ordem
  from public.convites_oracao
  where status = 'pendente'
)
update public.convites_oracao convite
set status = 'expirado'
from duplicados
where convite.id = duplicados.id
  and duplicados.ordem > 1;

create unique index if not exists convites_oracao_um_pendente_por_remetente
on public.convites_oracao (remetente_id)
where status = 'pendente';

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

  if v_remetente_id is null then
    raise exception 'USUARIO_NAO_ENCONTRADO';
  end if;
  if p_destinatario_id is null then
    raise exception 'DUPLA_NAO_DEFINIDA';
  end if;
  if p_destinatario_id = v_remetente_id then
    raise exception 'CONVITE_PARA_SI_MESMO';
  end if;
  if p_tipo_conexao not in ('aceite', 'voz', 'video') then
    raise exception 'TIPO_CONEXAO_INVALIDO';
  end if;
  if not exists (select 1 from public.usuarios where id = p_destinatario_id) then
    raise exception 'DESTINATARIO_NAO_ENCONTRADO';
  end if;

  -- Um segundo toque devolve o convite já criado, sem gerar erro ou duplicata.
  select id into v_convite_id
  from public.convites_oracao
  where remetente_id = v_remetente_id
    and destinatario_id = p_destinatario_id
    and status = 'pendente'
  order by criado_em desc
  limit 1;

  if v_convite_id is not null then
    return v_convite_id;
  end if;

  if exists (
    select 1 from public.convites_oracao
    where remetente_id = p_destinatario_id
      and destinatario_id = v_remetente_id
      and status = 'pendente'
  ) then
    raise exception 'CONVITE_RECEBIDO_PENDENTE';
  end if;

  -- Somente presença conectada em sala ativa bloqueia um novo convite.
  if exists (
    select 1
    from public.salas_oracao sala
    join public.salas_oracao_participantes participante on participante.sala_id = sala.id
    where participante.usuario_id = v_remetente_id
      and participante.desconectado_em is null
      and sala.status_sala = 'ativa'
  ) then
    raise exception 'REMETENTE_EM_SALA_ATIVA';
  end if;

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
