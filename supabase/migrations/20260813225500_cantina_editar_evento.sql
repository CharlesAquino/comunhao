create or replace function public.cantina_editar_evento(
  p_evento_id uuid, p_nome text, p_tipo text, p_local text,
  p_inicio_em timestamptz, p_fim_em timestamptz,
  p_reservas_abrem_em timestamptz default null,
  p_reservas_fecham_em timestamptz default null,
  p_cancelamento_ate timestamptz default null,
  p_tolerancia_retirada_minutos integer default 30
)
returns public.cantina_eventos language plpgsql security definer set search_path='' as $$
declare v_usuario uuid:=public.usuario_atual_id(); v_antes public.cantina_eventos; v_evento public.cantina_eventos;
begin
  if v_usuario is null or not public.admin_tem_permissao('canteen.events.manage') then raise exception 'PERMISSAO_NEGADA'; end if;
  select * into v_antes from public.cantina_eventos where id=p_evento_id for update;
  if v_antes.id is null then raise exception 'EVENTO_NAO_ENCONTRADO'; end if;
  if v_antes.status in ('encerrado','cancelado') then raise exception 'EVENTO_NAO_EDITAVEL'; end if;
  if p_fim_em<=p_inicio_em then raise exception 'PERIODO_INVALIDO'; end if;
  if p_reservas_abrem_em is not null and p_reservas_fecham_em is not null and p_reservas_fecham_em<=p_reservas_abrem_em then raise exception 'JANELA_RESERVA_INVALIDA'; end if;
  if p_reservas_fecham_em is not null and p_reservas_fecham_em>p_fim_em then raise exception 'JANELA_RESERVA_INVALIDA'; end if;
  update public.cantina_eventos set nome=btrim(p_nome),tipo=p_tipo,local=btrim(p_local),inicio_em=p_inicio_em,fim_em=p_fim_em,
    reservas_abrem_em=p_reservas_abrem_em,reservas_fecham_em=p_reservas_fecham_em,cancelamento_ate=p_cancelamento_ate,
    tolerancia_retirada_minutos=p_tolerancia_retirada_minutos,atualizado_por=v_usuario,atualizado_em=now()
  where id=p_evento_id returning * into v_evento;
  update public.cantina_anuncios set disponivel_ate=p_fim_em,
    disponivel_de=case when status='publicado' then disponivel_de else coalesce(p_reservas_abrem_em,p_inicio_em) end, atualizado_em=now()
  where evento_id=p_evento_id;
  insert into public.admin_audit_log(actor_user_id,permission,action,entity_type,entity_id,before_data,after_data,reason)
  values(v_usuario,'canteen.events.manage','update','cantina_evento',p_evento_id::text,to_jsonb(v_antes),to_jsonb(v_evento),'Edição das configurações do evento da Cantina');
  return v_evento;
end; $$;
revoke all on function public.cantina_editar_evento(uuid,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.cantina_editar_evento(uuid,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz,integer) to authenticated;

