-- Telemetria assistencial do Círculo de Oração.
-- Registra a formação de cada círculo e expõe uma projeção administrativa
-- mínima: nenhuma intenção, mensagem ou conteúdo de oração sai deste painel.

create table if not exists public.sorteio_circulo_execucoes (
  id uuid primary key default gen_random_uuid(),
  executado_por_id uuid not null references public.usuarios(id) on delete restrict,
  participantes_total integer not null check (participantes_total >= 2 and participantes_total <= 500),
  criado_em timestamptz not null default now()
);

create table if not exists public.sorteio_circulo_relacoes (
  execucao_id uuid not null references public.sorteio_circulo_execucoes(id) on delete cascade,
  participante_id uuid not null references public.usuarios(id) on delete restrict,
  orando_por_id uuid not null references public.usuarios(id) on delete restrict,
  sendo_orado_por_id uuid not null references public.usuarios(id) on delete restrict,
  primary key (execucao_id, participante_id),
  check (participante_id <> orando_por_id),
  check (participante_id <> sendo_orado_por_id)
);

create index if not exists sorteio_circulo_execucoes_criado_idx
  on public.sorteio_circulo_execucoes(criado_em desc);
create index if not exists sorteio_circulo_relacoes_execucao_idx
  on public.sorteio_circulo_relacoes(execucao_id, participante_id);

-- Falhas informadas pelo cliente após uma RPC de convite rejeitada. Elas são
-- separadas das recusas e ausências: tratam-se de erros de continuidade do app.
create table if not exists public.oracao_telemetria_eventos (
  id uuid primary key default gen_random_uuid(),
  ator_id uuid not null references public.usuarios(id) on delete cascade,
  destinatario_id uuid references public.usuarios(id) on delete set null,
  tipo text not null check (tipo in ('convite_dupla_falhou')),
  codigo text not null check (codigo ~ '^[A-Z0-9_]{3,80}$'),
  criado_em timestamptz not null default now()
);

create index if not exists oracao_telemetria_eventos_circulo_idx
  on public.oracao_telemetria_eventos(tipo, criado_em desc);

alter table public.sorteio_circulo_execucoes enable row level security;
alter table public.sorteio_circulo_relacoes enable row level security;
alter table public.oracao_telemetria_eventos enable row level security;
revoke all on public.sorteio_circulo_execucoes, public.sorteio_circulo_relacoes, public.oracao_telemetria_eventos from public, anon, authenticated;

create or replace function public.admin_aplicar_sorteio_circulo(
  p_relacoes jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_actor uuid := public.usuario_atual_id();
  v_execucao_id uuid;
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'PRAYER_DRAW_REQUIRED';
  end if;
  if coalesce(jsonb_typeof(p_relacoes) <> 'array', true)
    or jsonb_array_length(p_relacoes) < 2
    or jsonb_array_length(p_relacoes) > 500 then
    raise exception 'SORTEIO_RELACOES_INVALIDAS';
  end if;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  )
  select count(*)::integer into v_count from payload;

  if v_count <> jsonb_array_length(p_relacoes)
    or exists (
      with payload as (
        select (item->>'id')::uuid as id, (item->>'orando_por_id')::uuid as orando_por_id,
          (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
        from jsonb_array_elements(p_relacoes) as item
      )
      select 1 from payload
      group by id having count(*) > 1
      union all
      select 1 from payload where id is null or orando_por_id is null or sendo_orado_por_id is null
        or id = orando_por_id or id = sendo_orado_por_id
    ) then
    raise exception 'SORTEIO_RELACOES_INVALIDAS';
  end if;

  insert into public.sorteio_circulo_execucoes (executado_por_id, participantes_total)
  values (v_actor, v_count)
  returning id into v_execucao_id;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  )
  insert into public.sorteio_circulo_relacoes (
    execucao_id, participante_id, orando_por_id, sendo_orado_por_id
  )
  select v_execucao_id, id, orando_por_id, sendo_orado_por_id from payload;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  ), updated as (
    update public.usuarios u
    set orando_por_id = payload.orando_por_id,
        sendo_orado_por_id = payload.sendo_orado_por_id
    from payload
    where u.id = payload.id
    returning 1
  )
  select count(*)::integer into v_count from updated;

  if v_count <> jsonb_array_length(p_relacoes) then
    raise exception 'SORTEIO_PARTICIPANTE_INVALIDO';
  end if;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor, 'prayer.draw', 'prayer.circle.draw', 'sorteio_circulo', v_execucao_id::text,
    jsonb_build_object('participantes', v_count), 'Formação do círculo de oração'
  );

  return v_count;
end;
$$;

revoke all on function public.admin_aplicar_sorteio_circulo(jsonb) from public, anon;
grant execute on function public.admin_aplicar_sorteio_circulo(jsonb) to authenticated;

create or replace function public.registrar_falha_convite_dupla(
  p_destinatario_id uuid,
  p_codigo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_destinatario_id is null or v_codigo !~ '^[A-Z0-9_]{3,80}$' then
    raise exception 'EVENTO_TELEMETRIA_INVALIDO';
  end if;
  if not exists (
    select 1 from public.usuarios u
    where u.id = v_actor and u.orando_por_id = p_destinatario_id
  ) then
    raise exception 'DUPLA_NAO_ATIVA';
  end if;

  -- Coalescência curta para evitar que um retry de rede infle a métrica.
  if exists (
    select 1 from public.oracao_telemetria_eventos e
    where e.ator_id = v_actor
      and e.destinatario_id = p_destinatario_id
      and e.tipo = 'convite_dupla_falhou'
      and e.codigo = v_codigo
      and e.criado_em > now() - interval '45 seconds'
  ) then
    return;
  end if;

  insert into public.oracao_telemetria_eventos (ator_id, destinatario_id, tipo, codigo)
  values (v_actor, p_destinatario_id, 'convite_dupla_falhou', v_codigo);
end;
$$;

revoke all on function public.registrar_falha_convite_dupla(uuid, text) from public, anon;
grant execute on function public.registrar_falha_convite_dupla(uuid, text) to authenticated;

create or replace function public.admin_obter_telemetria_sorteio(
  p_inicio timestamptz default (now() - interval '30 days'),
  p_fim timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := coalesce(p_inicio, now() - interval '30 days');
  v_fim timestamptz := coalesce(p_fim, now());
  v_detalhe_sensivel boolean := public.admin_tem_permissao('people.sensitive') or public.admin_tem_permissao('pastoral.read');
  v_result jsonb;
begin
  if not public.admin_tem_permissao('prayer.read') then
    raise exception 'PRAYER_READ_REQUIRED';
  end if;
  if v_inicio > v_fim or v_inicio < now() - interval '366 days' or v_fim > now() + interval '1 day' then
    raise exception 'PERIODO_TELEMETRIA_INVALIDO';
  end if;

  with convites as (
    select c.*
    from public.convites_oracao c
    where c.origem = 'dupla_semana'
      and c.criado_em >= v_inicio
      and c.criado_em < v_fim
  ), metricas as (
    select
      count(*)::integer as chamadas,
      count(*) filter (where status = 'aceito')::integer as aceitas,
      count(*) filter (where status = 'recusado')::integer as recusadas,
      count(*) filter (where status = 'expirado')::integer as expiradas,
      count(*) filter (where status = 'pendente' and criado_em < now() - interval '30 minutes')::integer as sem_resposta,
      count(*) filter (where status = 'aceito' and finalizado_em is not null)::integer as concluidas
    from convites
  ), falhas as (
    select count(*)::integer as total
    from public.oracao_telemetria_eventos e
    where e.tipo = 'convite_dupla_falhou'
      and e.criado_em >= v_inicio and e.criado_em < v_fim
  ), ultima_execucao as (
    select e.id, e.criado_em, e.participantes_total, u.nome as executado_por
    from public.sorteio_circulo_execucoes e
    join public.usuarios u on u.id = e.executado_por_id
    order by e.criado_em desc
    limit 1
  ), serie as (
    select jsonb_agg(jsonb_build_object(
      'dia', to_char(dia, 'YYYY-MM-DD'),
      'chamadas', coalesce(contagem.chamadas, 0),
      'aceitas', coalesce(contagem.aceitas, 0),
      'concluidas', coalesce(contagem.concluidas, 0),
      'falhas', coalesce(contagem.falhas, 0)
    ) order by dia) as dados
    from generate_series(date_trunc('day', v_inicio), date_trunc('day', v_fim), interval '1 day') as dia
    left join lateral (
      select
        count(c.id)::integer as chamadas,
        count(c.id) filter (where c.status = 'aceito')::integer as aceitas,
        count(c.id) filter (where c.status = 'aceito' and c.finalizado_em is not null)::integer as concluidas,
        (select count(e.id)::integer from public.oracao_telemetria_eventos e
          where e.tipo = 'convite_dupla_falhou' and e.criado_em >= dia and e.criado_em < dia + interval '1 day') as falhas
      from public.convites_oracao c
      where c.origem = 'dupla_semana' and c.criado_em >= dia and c.criado_em < dia + interval '1 day'
    ) contagem on true
  ), circulo as (
    select jsonb_agg(jsonb_build_object(
      'participante', participante.nome,
      'ora_por', alvo.nome,
      'e_orado_por', intercessor.nome
    ) order by participante.nome) as pares
    from ultima_execucao e
    join public.sorteio_circulo_relacoes r on r.execucao_id = e.id
    join public.usuarios participante on participante.id = r.participante_id
    join public.usuarios alvo on alvo.id = r.orando_por_id
    join public.usuarios intercessor on intercessor.id = r.sendo_orado_por_id
  ), sem_resposta as (
    select jsonb_agg(jsonb_build_object(
      'quem_chamou', remetente.nome,
      'quem_nao_respondeu', destinatario.nome,
      'criado_em', c.criado_em,
      'minutos_aguardando', floor(extract(epoch from now() - c.criado_em) / 60)::integer
    ) order by c.criado_em desc) as itens
    from (
      select * from public.convites_oracao
      where origem = 'dupla_semana' and status = 'pendente'
        and criado_em < now() - interval '30 minutes'
      order by criado_em desc limit 30
    ) c
    join public.usuarios remetente on remetente.id = c.remetente_id
    join public.usuarios destinatario on destinatario.id = c.destinatario_id
  ), atendimentos as (
    select jsonb_agg(jsonb_build_object(
      'quem_atendeu', destinatario.nome,
      'quem_chamou', remetente.nome,
      'aceito_em', c.iniciado_em,
      'concluida', c.finalizado_em is not null
    ) order by c.iniciado_em desc) as itens
    from (
      select * from public.convites_oracao
      where origem = 'dupla_semana' and status = 'aceito'
        and criado_em >= v_inicio and criado_em < v_fim
      order by iniciado_em desc nulls last limit 30
    ) c
    join public.usuarios remetente on remetente.id = c.remetente_id
    join public.usuarios destinatario on destinatario.id = c.destinatario_id
  ), necessidades as (
    select jsonb_agg(jsonb_build_object(
      'pessoa', case when v_detalhe_sensivel then u.nome else 'Identidade protegida' end,
      'categoria', p.categoria,
      'acompanhamento', p.acompanhamento,
      'status', p.status,
      'criado_em', p.criado_em,
      'intercessoes_confirmadas', coalesce(confirmacoes.total, 0)
    ) order by p.criado_em desc) as itens
    from (
      select * from public.oracao_pedidos
      where status in ('aberto', 'acolhido') and expira_em > now()
      order by criado_em desc limit 30
    ) p
    join public.usuarios u on u.id = p.autor_id
    left join lateral (
      select count(*)::integer as total from public.oracao_intercessoes i
      where i.pedido_id = p.id and i.status = 'concluida'
    ) confirmacoes on true
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('inicio', v_inicio, 'fim', v_fim),
    'kpis', jsonb_build_object(
      'chamadas', metricas.chamadas,
      'aceitas', metricas.aceitas,
      'concluidas', metricas.concluidas,
      'sem_resposta', metricas.sem_resposta,
      'recusadas', metricas.recusadas,
      'expiradas', metricas.expiradas,
      'falhas_app', falhas.total,
      'taxa_aceite', case when metricas.chamadas = 0 then 0 else round(metricas.aceitas::numeric / metricas.chamadas * 100, 1) end,
      'taxa_continuidade', case when metricas.aceitas = 0 then 0 else round(metricas.concluidas::numeric / metricas.aceitas * 100, 1) end
    ),
    'ultima_formacao', coalesce((select jsonb_build_object(
      'id', id, 'criado_em', criado_em, 'participantes', participantes_total, 'executado_por', executado_por
    ) from ultima_execucao), '{}'::jsonb),
    'serie_diaria', coalesce((select dados from serie), '[]'::jsonb),
    'circulo_atual', coalesce((select pares from circulo), '[]'::jsonb),
    'sem_resposta', coalesce((select itens from sem_resposta), '[]'::jsonb),
    'atendimentos', coalesce((select itens from atendimentos), '[]'::jsonb),
    'necessidades_assistenciais', coalesce((select itens from necessidades), '[]'::jsonb),
    'identidades_assistenciais_visiveis', v_detalhe_sensivel
  ) into v_result
  from metricas cross join falhas;

  return v_result;
end;
$$;

revoke all on function public.admin_obter_telemetria_sorteio(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_obter_telemetria_sorteio(timestamptz, timestamptz) to authenticated;

comment on function public.admin_obter_telemetria_sorteio(timestamptz, timestamptz) is
  'Painel assistencial do círculo: revela métricas e relações de oração, nunca o conteúdo de intenções ou mensagens privadas.';
