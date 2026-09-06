-- KPIs de uso com minimização de dados, retenção e auditoria.

create table if not exists public.user_area_usage_daily (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  area text not null check (area in ('inicio','mural','ebd','tesouro','carteira','comunidade','mensagens','oracao','jornada','perfil','administracao')),
  dia date not null default current_date,
  acessos integer not null default 1 check (acessos > 0),
  primeiro_acesso_em timestamptz not null default now(),
  ultimo_acesso_em timestamptz not null default now(),
  primary key (usuario_id, area, dia)
);

create table if not exists public.user_area_usage_monthly (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  area text not null,
  mes date not null,
  acessos bigint not null check (acessos > 0),
  primary key (usuario_id, area, mes)
);

alter table public.user_area_usage_daily enable row level security;
alter table public.user_area_usage_monthly enable row level security;
revoke all on public.user_area_usage_daily, public.user_area_usage_monthly from anon, authenticated;

create index if not exists user_area_usage_daily_periodo_idx
  on public.user_area_usage_daily (dia desc, usuario_id);

create or replace function public.registrar_acesso_area(p_area text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := public.usuario_atual_id();
begin
  if v_usuario is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_area not in ('inicio','mural','ebd','tesouro','carteira','comunidade','mensagens','oracao','jornada','perfil','administracao') then
    raise exception 'AREA_INVALIDA';
  end if;

  insert into public.user_area_usage_daily (usuario_id, area, dia)
  values (v_usuario, p_area, current_date)
  on conflict (usuario_id, area, dia) do update
    set acessos = public.user_area_usage_daily.acessos + 1,
        ultimo_acesso_em = now();

  -- Consolidação oportunista: somente uma sessão executa o expurgo por vez.
  if pg_try_advisory_xact_lock(hashtext('comunhao_usage_retention')) then
    insert into public.user_area_usage_monthly (usuario_id, area, mes, acessos)
    select usuario_id, area, date_trunc('month', dia)::date, sum(acessos)
    from public.user_area_usage_daily
    where dia < current_date - 90
    group by usuario_id, area, date_trunc('month', dia)::date
    on conflict (usuario_id, area, mes) do update
      set acessos = public.user_area_usage_monthly.acessos + excluded.acessos;

    delete from public.user_area_usage_daily where dia < current_date - 90;
  end if;
end;
$$;

revoke all on function public.registrar_acesso_area(text) from public;
grant execute on function public.registrar_acesso_area(text) to authenticated;

create or replace function public.admin_listar_kpis_usuarios(p_periodo_dias integer default 30)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_periodo integer;
  v_inicio timestamptz;
  v_ator uuid := public.usuario_atual_id();
  v_resultado jsonb;
begin
  if not public.admin_tem_permissao('people.sensitive') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;
  v_periodo := case when p_periodo_dias in (7,30,90) then p_periodo_dias else 30 end;
  v_inicio := now() - make_interval(days => v_periodo);

  with interacoes as (
    select m.remetente_id usuario_id, m.destinatario_id parceiro_id, 'mensagens'::text tipo, count(*)::bigint total
      from public.mensagens m where m.criado_em >= v_inicio group by 1,2
    union all
    select m.destinatario_id, m.remetente_id, 'mensagens', count(*)::bigint
      from public.mensagens m where m.criado_em >= v_inicio group by 1,2
    union all
    select a.usuario_id, b.usuario_id, 'oracoes', count(distinct a.sala_id)::bigint
      from public.salas_oracao_participantes a
      join public.salas_oracao_participantes b on b.sala_id=a.sala_id and b.usuario_id<>a.usuario_id
      where a.conectado_em >= v_inicio group by 1,2
    union all
    select c.autor_id, p.autor_id, 'mural', count(*)::bigint
      from public.mural_comentarios c join public.pedidos p on p.id=c.publicacao_id
      where c.criado_em >= v_inicio and c.autor_id<>p.autor_id group by 1,2
    union all
    select i.intercessor_id, p.autor_id, 'intercessoes', count(*)::bigint
      from public.oracao_intercessoes i join public.oracao_pedidos p on p.id=i.pedido_id
      where i.assumida_em >= v_inicio and i.intercessor_id<>p.autor_id group by 1,2
  ), interacoes_agrupadas as (
    select usuario_id, parceiro_id, sum(total)::bigint total,
      jsonb_object_agg(tipo, total) tipos
    from (select usuario_id, parceiro_id, tipo, sum(total)::bigint total from interacoes group by 1,2,3) x
    group by 1,2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'usuario_id', u.id, 'nome', u.nome, 'foto_url', u.foto_url, 'last_login', u.last_login,
    'kesef_saldo', coalesce(k.saldo,0), 'kesef_recebido', coalesce(k.recebido,0), 'kesef_utilizado', coalesce(k.utilizado,0),
    'total_acessos', coalesce(a.total,0), 'areas', coalesce(a.areas,'[]'::jsonb),
    'interacoes', coalesce(i.interacoes,'[]'::jsonb)
  ) order by coalesce(a.total,0) desc, u.nome), '[]'::jsonb)
  into v_resultado
  from public.usuarios u
  left join lateral (
    select coalesce(sum(quantidade),0)::bigint saldo,
      coalesce(sum(quantidade) filter(where criado_em>=v_inicio and quantidade>0),0)::bigint recebido,
      abs(coalesce(sum(quantidade) filter(where criado_em>=v_inicio and quantidade<0),0))::bigint utilizado
    from public.kesef_ledger where usuario_id=u.id
  ) k on true
  left join lateral (
    select sum(d.acessos)::bigint total,
      jsonb_agg(jsonb_build_object('area',d.area,'acessos',d.acessos) order by d.acessos desc) areas
    from (select area,sum(acessos)::bigint acessos from public.user_area_usage_daily
      where usuario_id=u.id and dia>=current_date-v_periodo group by area) d
  ) a on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('usuario_id',z.parceiro_id,'nome',p.nome,'foto_url',p.foto_url,'total',z.total,'tipos',z.tipos) order by z.total desc) interacoes
    from (select * from interacoes_agrupadas where usuario_id=u.id order by total desc limit 3) z
    join public.usuarios p on p.id=z.parceiro_id
  ) i on true;

  insert into public.admin_audit_log(actor_user_id,permission,action,entity_type,after_data,reason)
  values(v_ator,'people.sensitive','user_kpis.view','user_analytics',jsonb_build_object('periodo_dias',v_periodo),'Consulta agregada; nenhum conteúdo privado foi exposto.');
  return jsonb_build_object('periodo_dias',v_periodo,'gerado_em',now(),'usuarios',v_resultado);
end;
$$;

revoke all on function public.admin_listar_kpis_usuarios(integer) from public;
grant execute on function public.admin_listar_kpis_usuarios(integer) to authenticated;
