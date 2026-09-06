-- Separa o compromisso da dupla semanal dos convites eventuais da Sala de
-- Oração e permite convidar novas pessoas para uma sala LiveKit existente.

alter table public.convites_oracao
  add column if not exists origem text not null default 'dupla_semana';

alter table public.convites_oracao
  drop constraint if exists convites_oracao_origem_check;
alter table public.convites_oracao
  add constraint convites_oracao_origem_check
  check (origem in ('dupla_semana', 'sala_oracao'));

create or replace function public.enviar_convite_oracao(
  p_destinatario_id uuid,
  p_tipo_conexao text,
  p_origem text
) returns uuid
language plpgsql security definer set search_path = public, auth
as $$
declare v_remetente_id uuid; v_convite_id uuid;
begin
  v_remetente_id := public.usuario_atual_id();
  if v_remetente_id is null then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;
  if p_destinatario_id is null then raise exception 'DESTINATARIO_NAO_ENCONTRADO'; end if;
  if p_destinatario_id = v_remetente_id then raise exception 'CONVITE_PARA_SI_MESMO'; end if;
  if p_tipo_conexao not in ('aceite','voz','video') then raise exception 'TIPO_CONEXAO_INVALIDO'; end if;
  if p_origem not in ('dupla_semana','sala_oracao') then raise exception 'ORIGEM_CONVITE_INVALIDA'; end if;
  if not exists(select 1 from public.usuarios where id=p_destinatario_id) then raise exception 'DESTINATARIO_NAO_ENCONTRADO'; end if;

  select id into v_convite_id from public.convites_oracao
   where remetente_id=v_remetente_id and destinatario_id=p_destinatario_id
     and status='pendente' and origem=p_origem order by criado_em desc limit 1;
  if v_convite_id is not null then return v_convite_id; end if;

  if exists(select 1 from public.convites_oracao where remetente_id=p_destinatario_id and destinatario_id=v_remetente_id and status='pendente')
    then raise exception 'CONVITE_RECEBIDO_PENDENTE'; end if;

  perform public.liberar_salas_oracao_do_usuario(v_remetente_id);
  insert into public.convites_oracao(remetente_id,destinatario_id,tipo_conexao_remetente,origem)
  values(v_remetente_id,p_destinatario_id,p_tipo_conexao,p_origem) returning id into v_convite_id;
  return v_convite_id;
exception when unique_violation then
  select id into v_convite_id from public.convites_oracao where remetente_id=v_remetente_id and status='pendente' order by criado_em desc limit 1;
  if v_convite_id is not null then return v_convite_id; end if;
  raise;
end; $$;

revoke all on function public.enviar_convite_oracao(uuid,text,text) from public, anon;
grant execute on function public.enviar_convite_oracao(uuid,text,text) to authenticated;

create or replace function public.convidar_para_sala_oracao(p_sala_id uuid, p_destinatario_id uuid)
returns uuid language plpgsql security definer set search_path=public,auth
as $$
declare v_remetente uuid; v_convite uuid; v_sala public.salas_oracao%rowtype;
begin
  v_remetente := public.usuario_atual_id();
  select * into v_sala from public.salas_oracao where id=p_sala_id for update;
  if v_sala.id is null or v_sala.status_sala not in ('aguardando','ativa') then raise exception 'SALA_NAO_DISPONIVEL'; end if;
  if not exists(select 1 from public.salas_oracao_participantes where sala_id=p_sala_id and usuario_id=v_remetente and desconectado_em is null)
    then raise exception 'NAO_PARTICIPA_DA_SALA'; end if;
  if p_destinatario_id=v_remetente then raise exception 'CONVITE_PARA_SI_MESMO'; end if;
  if exists(select 1 from public.salas_oracao_participantes where sala_id=p_sala_id and usuario_id=p_destinatario_id and desconectado_em is null)
    then raise exception 'PESSOA_JA_ESTA_NA_SALA'; end if;
  if (select count(*) from public.salas_oracao_participantes where sala_id=p_sala_id and desconectado_em is null) >= 25
    then raise exception 'LIMITE_DA_SALA_ATINGIDO'; end if;

  select id into v_convite from public.convites_oracao
   where remetente_id=v_remetente and destinatario_id=p_destinatario_id and sala_id=p_sala_id and status='pendente' limit 1;
  if v_convite is not null then return v_convite; end if;

  insert into public.convites_oracao(remetente_id,destinatario_id,tipo_conexao_remetente,sala_id,origem)
  values(v_remetente,p_destinatario_id,'voz',p_sala_id,'sala_oracao') returning id into v_convite;
  return v_convite;
end; $$;

revoke all on function public.convidar_para_sala_oracao(uuid,uuid) from public,anon;
grant execute on function public.convidar_para_sala_oracao(uuid,uuid) to authenticated;

create or replace function public.responder_convite_oracao(p_convite_id uuid,p_resposta text,p_tipo_conexao text default 'aceite')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_convite public.convites_oracao%rowtype; v_usuario uuid; v_sala uuid; v_usar_sala boolean;
begin
  select id into v_usuario from public.usuarios where auth_user_id=auth.uid();
  select * into v_convite from public.convites_oracao where id=p_convite_id for update;
  if v_convite.id is null then raise exception 'CONVITE_NAO_ENCONTRADO'; end if;
  if v_convite.status<>'pendente' then raise exception 'CONVITE_JA_RESPONDIDO'; end if;
  if v_convite.destinatario_id<>v_usuario then raise exception 'NAO_AUTORIZADO'; end if;
  if p_resposta='recusado' then update public.convites_oracao set status='recusado' where id=p_convite_id; return jsonb_build_object('status','recusado'); end if;
  if p_resposta<>'aceito' then raise exception 'RESPOSTA_INVALIDA'; end if;
  if p_tipo_conexao not in ('aceite','voz','video') then raise exception 'TIPO_CONEXAO_INVALIDO'; end if;
  v_usar_sala := v_convite.sala_id is not null or (v_convite.tipo_conexao_remetente in ('voz','video') and p_tipo_conexao in ('voz','video'));

  if v_convite.sala_id is not null then
    select id into v_sala from public.salas_oracao where id=v_convite.sala_id and status_sala in ('aguardando','ativa') for update;
    if v_sala is null then raise exception 'SALA_NAO_DISPONIVEL'; end if;
    if (select count(*) from public.salas_oracao_participantes where sala_id=v_sala and desconectado_em is null)>=25 then raise exception 'LIMITE_DA_SALA_ATINGIDO'; end if;
    insert into public.salas_oracao_participantes(sala_id,usuario_id) values(v_sala,v_usuario)
    on conflict(sala_id,usuario_id) do update set desconectado_em=null;
  elsif v_usar_sala then
    insert into public.salas_oracao(tipo_sala,status_sala,host_usuario_id,livekit_room_name,iniciada_em)
    values(case when v_convite.origem='dupla_semana' then 'circulo_semana' else 'livre' end,'ativa',v_convite.remetente_id,'sala_'||substr(md5(random()::text||clock_timestamp()::text),1,20),now())
    returning id into v_sala;
    insert into public.salas_oracao_participantes(sala_id,usuario_id) values(v_sala,v_convite.remetente_id),(v_sala,v_convite.destinatario_id)
    on conflict(sala_id,usuario_id) do update set desconectado_em=null;
  else
    insert into public.sessoes_oracao_timer(convite_id,usuario_id) values(p_convite_id,v_convite.remetente_id),(p_convite_id,v_convite.destinatario_id)
    on conflict(convite_id,usuario_id) do nothing;
  end if;

  update public.convites_oracao set status='aceito',tipo_conexao_destinatario=p_tipo_conexao,iniciado_em=now(),sala_id=v_sala where id=p_convite_id;
  return jsonb_build_object('status','aceito','sala_id',v_sala,'conexao_final',case when v_usar_sala then 'voz_video' else 'aceite' end);
end; $$;

revoke all on function public.responder_convite_oracao(uuid,text,text) from public;
grant execute on function public.responder_convite_oracao(uuid,text,text) to authenticated;

create or replace function public.finalizar_convites_da_sala()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if old.status_sala is distinct from 'encerrada' and new.status_sala='encerrada' then
    update public.convites_oracao set finalizado_em=coalesce(finalizado_em,now()) where sala_id=new.id and status='aceito';
  end if;
  return new;
end; $$;

drop trigger if exists salas_oracao_finalizar_convites on public.salas_oracao;
create trigger salas_oracao_finalizar_convites after update of status_sala on public.salas_oracao
for each row execute function public.finalizar_convites_da_sala();
