-- Continuidade anti-IDOR: fecha RPCs legadas de XP/PC/engajamento que aceitavam
-- um usuario_id arbitrário sob SECURITY DEFINER.

create or replace function public.creditar_xp(
  p_usuario_id uuid,
  p_quantidade integer,
  p_referencia_id text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_novo_xp integer;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  update public.usuarios u
  set xp = u.xp + p_quantidade,
      ultima_atividade = pg_catalog.now()
  where u.id = p_usuario_id
  returning u.xp into v_novo_xp;

  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;
  return v_novo_xp;
end;
$$;

create or replace function public.creditar_pc(
  p_usuario_id uuid,
  p_quantidade integer,
  p_referencia_id text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_pc_atual integer;
  v_pc_final integer;
  v_xp_atual integer;
  v_patente record;
  v_proxima_patente record;
  v_divisao integer;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  select u.pontos_comunhao_divisao, u.xp
  into v_pc_atual, v_xp_atual
  from public.usuarios u
  where u.id = p_usuario_id
  for update;
  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;

  v_pc_final := least(coalesce(v_pc_atual, 0) + p_quantidade, 100);
  update public.usuarios u
  set pontos_comunhao_divisao = v_pc_final,
      ultima_atividade = pg_catalog.now()
  where u.id = p_usuario_id;

  if v_pc_final = 100 then
    select p.* into v_patente
    from public.patentes p
    where p.xp_min <= v_xp_atual
    order by p.xp_min desc
    limit 1;

    if found then
      select p.* into v_proxima_patente
      from public.patentes p
      where p.ordem = v_patente.ordem + 1;

      if found then
        v_divisao := 4;
        if v_xp_atual >= v_proxima_patente.xp_min
          - ((v_proxima_patente.xp_min - v_patente.xp_min) / v_divisao)::integer then
          perform public.iniciar_prova_ascensao(p_usuario_id);
        end if;
      end if;
    end if;
  end if;

  return v_pc_final;
end;
$$;

create or replace function public.registrar_evento_engajamento(
  p_usuario_id uuid,
  p_tipo_evento text,
  p_referencia_id text default null
)
returns table (
  kesef_creditado boolean,
  xp_creditado boolean,
  pc_creditado boolean,
  kesef_quantidade integer,
  xp_quantidade integer,
  pc_quantidade integer,
  mensagem text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_kesef_tipo text;
  v_kesef_qtd integer;
  v_xp_qtd integer;
  v_pc_qtd integer;
  v_referencia_uuid uuid;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  case p_tipo_evento
    when 'oracao' then v_kesef_tipo := 'oracao'; v_kesef_qtd := 10; v_xp_qtd := 5; v_pc_qtd := 6;
    when 'licao' then v_kesef_tipo := 'licao'; v_kesef_qtd := 5; v_xp_qtd := 10; v_pc_qtd := 8;
    when 'quiz_acerto' then v_kesef_tipo := 'quiz_acerto'; v_kesef_qtd := 3; v_xp_qtd := 3; v_pc_qtd := 4;
    when 'streak_7' then v_kesef_tipo := 'streak_bonus_7'; v_kesef_qtd := 15; v_xp_qtd := 12; v_pc_qtd := 20;
    when 'streak_30' then v_kesef_tipo := 'streak_bonus_30'; v_kesef_qtd := 50; v_xp_qtd := 50; v_pc_qtd := 60;
    when 'indicacao' then v_kesef_tipo := 'indicacao'; v_kesef_qtd := 20; v_xp_qtd := 15; v_pc_qtd := 12;
    else raise exception 'TIPO_EVENTO_INVALIDO';
  end case;

  if nullif(btrim(p_referencia_id), '') is not null then
    v_referencia_uuid := md5(p_referencia_id)::uuid;
  end if;

  begin
    perform public.creditar_kesef(p_usuario_id, v_kesef_tipo, v_kesef_qtd, v_referencia_uuid);
    kesef_creditado := true; kesef_quantidade := v_kesef_qtd;
  exception when others then
    kesef_creditado := false; kesef_quantidade := 0;
  end;

  begin
    perform public.creditar_xp(p_usuario_id, v_xp_qtd, p_referencia_id);
    xp_creditado := true; xp_quantidade := v_xp_qtd;
  exception when others then
    xp_creditado := false; xp_quantidade := 0;
  end;

  begin
    perform public.creditar_pc(p_usuario_id, v_pc_qtd, p_referencia_id);
    pc_creditado := true; pc_quantidade := v_pc_qtd;
  exception when others then
    pc_creditado := false; pc_quantidade := 0;
  end;

  mensagem := case
    when kesef_creditado and xp_creditado and pc_creditado then 'OK'
    when not kesef_creditado and xp_creditado and pc_creditado then 'CAP_DIARIO_ATINGIDO'
    else 'ERRO_PARCIAL'
  end;
  return next;
end;
$$;

revoke all on function public.creditar_xp(uuid, integer, text) from public, anon;
grant execute on function public.creditar_xp(uuid, integer, text) to authenticated;
revoke all on function public.creditar_pc(uuid, integer, text) from public, anon;
grant execute on function public.creditar_pc(uuid, integer, text) to authenticated;
revoke all on function public.registrar_evento_engajamento(uuid, text, text) from public, anon;
grant execute on function public.registrar_evento_engajamento(uuid, text, text) to authenticated;
