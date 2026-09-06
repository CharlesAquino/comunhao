alter table public.cantina_reservas
  add column if not exists representante_id uuid references public.usuarios(id) on delete set null,
  add column if not exists representante_autorizado_em timestamptz,
  add column if not exists processado_por_id uuid references public.usuarios(id) on delete set null;

create or replace function public.cantina_autorizar_representante(p_reserva_id uuid, p_username text)
returns public.cantina_reservas language plpgsql security definer set search_path='' as $$
declare v_usuario uuid:=public.usuario_atual_id(); v_representante uuid; v_reserva public.cantina_reservas;
begin
  select * into v_reserva from public.cantina_reservas where id=p_reserva_id for update;
  if v_reserva.id is null or v_reserva.usuario_id<>v_usuario or v_reserva.status<>'reservada' then raise exception 'RESERVA_NAO_AUTORIZAVEL'; end if;
  select id into v_representante from public.usuarios where lower(username)=lower(btrim(p_username)) and id<>v_usuario;
  if v_representante is null then raise exception 'REPRESENTANTE_NAO_ENCONTRADO'; end if;
  update public.cantina_reservas set representante_id=v_representante,representante_autorizado_em=now(),atualizado_em=now()
  where id=p_reserva_id returning * into v_reserva;
  return v_reserva;
end; $$;

create or replace function public.cantina_marcar_nao_comparecimento(p_reserva_id uuid)
returns public.cantina_reservas language plpgsql security definer set search_path='' as $$
declare v_operador uuid:=public.usuario_atual_id(); v_reserva public.cantina_reservas; v_evento public.cantina_eventos;
begin
  if not public.admin_tem_permissao('canteen.checkout.operate') then raise exception 'PERMISSAO_NEGADA'; end if;
  select * into v_reserva from public.cantina_reservas where id=p_reserva_id for update;
  if v_reserva.id is null or v_reserva.status<>'reservada' then raise exception 'RESERVA_NAO_PROCESSAVEL'; end if;
  select * into v_evento from public.cantina_eventos where id=v_reserva.evento_id;
  if now()<v_evento.fim_em then raise exception 'EVENTO_AINDA_NAO_ENCERRADO'; end if;
  -- O estoque já foi separado e o Kesef já foi aprovisionado no ledger.
  -- A situação "doada" preserva ambos e libera a destinação física à comunidade.
  update public.cantina_reservas set status='doada',processado_por_id=v_operador,atualizado_em=now()
  where id=p_reserva_id returning * into v_reserva;
  insert into public.admin_audit_log(actor_user_id,permission,action,entity_type,entity_id,after_data,reason)
  values(v_operador,'canteen.checkout.operate','mark_no_show_donation','cantina_reserva',v_reserva.id::text,
    jsonb_build_object('status','doada','kesef_resgatado',v_reserva.kesef_aprovisionado),'Não comparecimento após o encerramento; item destinado à doação');
  return v_reserva;
end; $$;

create or replace function public.cantina_confirmar_retirada(p_reserva_id uuid,p_codigo_retirada text)
returns public.cantina_reservas language plpgsql security definer set search_path='' as $$
declare v_operador uuid:=public.usuario_atual_id(); v_reserva public.cantina_reservas; v_evento public.cantina_eventos;
begin
  if v_operador is null or not public.admin_tem_permissao('canteen.checkout.operate') then raise exception 'PERMISSAO_NEGADA'; end if;
  select * into v_reserva from public.cantina_reservas where id=p_reserva_id for update;
  if v_reserva.id is null or upper(v_reserva.codigo_retirada)<>upper(btrim(p_codigo_retirada)) then raise exception 'CODIGO_INVALIDO'; end if;
  if v_reserva.status<>'reservada' then raise exception 'RESERVA_JA_PROCESSADA'; end if;
  select * into v_evento from public.cantina_eventos where id=v_reserva.evento_id;
  if now()<v_evento.inicio_em-interval '2 hours' or now()>v_evento.fim_em+make_interval(mins=>v_evento.tolerancia_retirada_minutos) then raise exception 'FORA_DA_JANELA_DE_RETIRADA'; end if;
  update public.cantina_reservas set status='retirada',retirada_em=now(),processado_por_id=v_operador,atualizado_em=now() where id=v_reserva.id returning * into v_reserva;
  insert into public.admin_audit_log(actor_user_id,permission,action,entity_type,entity_id,after_data,reason)
  values(v_operador,'canteen.checkout.operate','confirm_pickup','cantina_reserva',v_reserva.id::text,
    jsonb_build_object('representante_id',v_reserva.representante_id),'Retirada presencial confirmada; titular ou representante apresenta o mesmo código');
  return v_reserva;
end; $$;

revoke all on function public.cantina_autorizar_representante(uuid,text) from public,anon;
grant execute on function public.cantina_autorizar_representante(uuid,text) to authenticated;
revoke all on function public.cantina_marcar_nao_comparecimento(uuid) from public,anon;
grant execute on function public.cantina_marcar_nao_comparecimento(uuid) to authenticated;

