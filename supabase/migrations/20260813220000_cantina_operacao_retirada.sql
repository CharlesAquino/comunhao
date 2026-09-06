-- Operação de retirada: busca mínima e confirmação atômica por operador autorizado.

create or replace function public.cantina_listar_retiradas_evento(p_evento_id uuid)
returns table (
  reserva_id uuid, codigo_retirada text, status text, quantidade integer,
  kesef_aprovisionado integer, reservada_em timestamptz, produto_nome text,
  membro_nome text, membro_username text
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.codigo_retirada, r.status, r.quantidade, r.kesef_aprovisionado,
    r.reservada_em, p.nome, u.nome, u.username
  from public.cantina_reservas r
  join public.cantina_anuncios a on a.id = r.anuncio_id
  join public.cantina_produtos p on p.id = a.produto_id
  join public.usuarios u on u.id = r.usuario_id
  where r.evento_id = p_evento_id
    and (public.admin_tem_permissao('canteen.checkout.operate')
      or public.admin_tem_permissao('canteen.redemptions.read'))
  order by case r.status when 'reservada' then 0 else 1 end, r.reservada_em;
$$;

create or replace function public.cantina_confirmar_retirada(
  p_reserva_id uuid,
  p_codigo_retirada text
)
returns public.cantina_reservas
language plpgsql security definer set search_path = ''
as $$
declare
  v_operador_id uuid := public.usuario_atual_id();
  v_reserva public.cantina_reservas;
  v_evento public.cantina_eventos;
begin
  if v_operador_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if not public.admin_tem_permissao('canteen.checkout.operate') then raise exception 'PERMISSAO_NEGADA'; end if;

  select * into v_reserva from public.cantina_reservas
  where id = p_reserva_id for update;
  if v_reserva.id is null or upper(v_reserva.codigo_retirada) <> upper(btrim(p_codigo_retirada)) then
    raise exception 'CODIGO_INVALIDO';
  end if;
  if v_reserva.status <> 'reservada' then raise exception 'RESERVA_JA_PROCESSADA'; end if;
  select * into v_evento from public.cantina_eventos where id = v_reserva.evento_id;
  if now() < v_evento.inicio_em - interval '2 hours' or now() > v_evento.fim_em + make_interval(mins => v_evento.tolerancia_retirada_minutos) then
    raise exception 'FORA_DA_JANELA_DE_RETIRADA';
  end if;

  update public.cantina_reservas set status = 'retirada', retirada_em = now(), atualizado_em = now()
  where id = v_reserva.id returning * into v_reserva;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_operador_id, 'canteen.checkout.operate', 'confirm_pickup', 'cantina_reserva', v_reserva.id::text,
    jsonb_build_object('evento_id', v_reserva.evento_id, 'quantidade', v_reserva.quantidade),
    'Retirada presencial confirmada pelo operador da Cantina'
  );
  return v_reserva;
end;
$$;

revoke all on function public.cantina_listar_retiradas_evento(uuid) from public, anon;
grant execute on function public.cantina_listar_retiradas_evento(uuid) to authenticated;
revoke all on function public.cantina_confirmar_retirada(uuid, text) from public, anon;
grant execute on function public.cantina_confirmar_retirada(uuid, text) to authenticated;

