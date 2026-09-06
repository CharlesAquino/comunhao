-- Cantina, fase 1: governança, eventos sem preços e linha de base agregada Kesef.
-- Não cria catálogo, reserva, hold ou débito da Cantina.

insert into public.admin_roles (code, name, description) values
  ('gestor_cantina', 'Gestor da Cantina', 'Gestão geral de eventos, equipe, estoque e relatórios da Cantina.'),
  ('operador_cantina', 'Operador da Cantina', 'Operação temporária de retirada em eventos atribuídos.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.admin_permissions (code, module, description) values
  ('canteen.read', 'canteen', 'Visualizar eventos e operação da Cantina.'),
  ('canteen.events.manage', 'canteen', 'Criar e administrar eventos da Cantina.'),
  ('canteen.team.manage', 'canteen', 'Atribuir equipe, turnos e caixas da Cantina.'),
  ('canteen.inventory.manage', 'canteen', 'Administrar contribuições, lotes e sobras.'),
  ('canteen.checkout.operate', 'canteen', 'Operar reservas, retiradas e resgates no evento.'),
  ('canteen.redemptions.read', 'canteen', 'Consultar resgates da Cantina no escopo autorizado.'),
  ('canteen.redemptions.reverse', 'canteen', 'Estornar resgate da Cantina com auditoria.'),
  ('canteen.reports.read', 'canteen', 'Consultar relatórios agregados da Cantina.')
on conflict (code) do update set
  module = excluded.module,
  description = excluded.description;

insert into public.admin_role_permissions (role_code, permission_code)
select 'administrador', p.code
from public.admin_permissions p
where p.code like 'canteen.%'
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code) values
  ('gestor_cantina', 'admin.access'),
  ('gestor_cantina', 'dashboard.read'),
  ('gestor_cantina', 'economy.read'),
  ('gestor_cantina', 'canteen.read'),
  ('gestor_cantina', 'canteen.events.manage'),
  ('gestor_cantina', 'canteen.team.manage'),
  ('gestor_cantina', 'canteen.inventory.manage'),
  ('gestor_cantina', 'canteen.checkout.operate'),
  ('gestor_cantina', 'canteen.redemptions.read'),
  ('gestor_cantina', 'canteen.redemptions.reverse'),
  ('gestor_cantina', 'canteen.reports.read'),
  ('operador_cantina', 'admin.access'),
  ('operador_cantina', 'dashboard.read'),
  ('operador_cantina', 'canteen.read'),
  ('operador_cantina', 'canteen.checkout.operate'),
  ('operador_cantina', 'canteen.redemptions.read')
on conflict do nothing;

create table if not exists public.cantina_eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 3 and 120),
  tipo text not null check (tipo in ('culto', 'congresso', 'acampamento', 'retiro', 'outro')),
  local text not null check (char_length(btrim(local)) between 2 and 160),
  inicio_em timestamptz not null,
  fim_em timestamptz not null,
  reservas_abrem_em timestamptz,
  reservas_fecham_em timestamptz,
  cancelamento_ate timestamptz,
  tolerancia_retirada_minutos integer not null default 30
    check (tolerancia_retirada_minutos between 0 and 240),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'anunciado', 'reservas_abertas', 'reservas_encerradas', 'aberto', 'pausado', 'encerrado', 'cancelado')),
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  atualizado_por uuid references public.usuarios(id) on delete set null,
  cancelado_motivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cantina_evento_periodo_valido check (fim_em > inicio_em),
  constraint cantina_evento_reservas_validas check (
    reservas_abrem_em is null
    or reservas_fecham_em is null
    or reservas_fecham_em > reservas_abrem_em
  ),
  constraint cantina_evento_reservas_antes_fim check (
    reservas_fecham_em is null or reservas_fecham_em <= fim_em
  )
);

create table if not exists public.cantina_evento_equipe (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  funcao text not null check (funcao in ('gestor', 'operador', 'estoque')),
  turno_inicio_em timestamptz not null,
  turno_fim_em timestamptz not null,
  atribuido_por uuid not null references public.usuarios(id) on delete restrict,
  revogado_em timestamptz,
  motivo text not null check (char_length(btrim(motivo)) >= 5),
  criado_em timestamptz not null default now(),
  constraint cantina_equipe_turno_valido check (turno_fim_em > turno_inicio_em),
  unique (evento_id, usuario_id, funcao, turno_inicio_em)
);

create index if not exists cantina_eventos_inicio_idx
  on public.cantina_eventos (inicio_em desc);
create index if not exists cantina_eventos_status_idx
  on public.cantina_eventos (status, inicio_em);
create index if not exists cantina_evento_equipe_usuario_idx
  on public.cantina_evento_equipe (usuario_id, turno_inicio_em, turno_fim_em)
  where revogado_em is null;

alter table public.cantina_eventos enable row level security;
alter table public.cantina_evento_equipe enable row level security;

drop policy if exists cantina_eventos_leitura on public.cantina_eventos;
create policy cantina_eventos_leitura on public.cantina_eventos
for select to authenticated using (
  public.admin_tem_permissao('canteen.read')
  or (
    status in ('anunciado', 'reservas_abertas', 'reservas_encerradas', 'aberto', 'pausado')
    and fim_em > now()
  )
);

drop policy if exists cantina_eventos_gestao on public.cantina_eventos;
create policy cantina_eventos_gestao on public.cantina_eventos
for all to authenticated
using (public.admin_tem_permissao('canteen.events.manage'))
with check (public.admin_tem_permissao('canteen.events.manage'));

drop policy if exists cantina_equipe_leitura on public.cantina_evento_equipe;
create policy cantina_equipe_leitura on public.cantina_evento_equipe
for select to authenticated using (
  usuario_id = public.usuario_atual_id()
  or public.admin_tem_permissao('canteen.team.manage')
);

drop policy if exists cantina_equipe_gestao on public.cantina_evento_equipe;
create policy cantina_equipe_gestao on public.cantina_evento_equipe
for all to authenticated
using (public.admin_tem_permissao('canteen.team.manage'))
with check (public.admin_tem_permissao('canteen.team.manage'));

create or replace function public.cantina_criar_evento(
  p_nome text,
  p_tipo text,
  p_local text,
  p_inicio_em timestamptz,
  p_fim_em timestamptz,
  p_reservas_abrem_em timestamptz default null,
  p_reservas_fecham_em timestamptz default null,
  p_cancelamento_ate timestamptz default null,
  p_tolerancia_retirada_minutos integer default 30
)
returns public.cantina_eventos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
  v_evento public.cantina_eventos;
begin
  if not public.admin_tem_permissao('canteen.events.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  v_usuario_id := public.usuario_atual_id();
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_inicio_em is null or p_fim_em is null or p_fim_em <= p_inicio_em then
    raise exception 'PERIODO_INVALIDO';
  end if;
  if p_reservas_abrem_em is not null and p_reservas_fecham_em is not null
     and p_reservas_fecham_em <= p_reservas_abrem_em then
    raise exception 'JANELA_RESERVAS_INVALIDA';
  end if;
  if p_reservas_fecham_em is not null and p_reservas_fecham_em > p_fim_em then
    raise exception 'JANELA_RESERVAS_INVALIDA';
  end if;

  insert into public.cantina_eventos (
    nome, tipo, local, inicio_em, fim_em, reservas_abrem_em,
    reservas_fecham_em, cancelamento_ate, tolerancia_retirada_minutos,
    criado_por, atualizado_por
  ) values (
    btrim(p_nome), p_tipo, btrim(p_local), p_inicio_em, p_fim_em,
    p_reservas_abrem_em, p_reservas_fecham_em, p_cancelamento_ate,
    p_tolerancia_retirada_minutos, v_usuario_id, v_usuario_id
  ) returning * into v_evento;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_usuario_id, 'canteen.events.manage', 'create', 'cantina_evento',
    v_evento.id::text, to_jsonb(v_evento), 'Criação do evento da Cantina'
  );

  return v_evento;
end;
$$;

create or replace function public.admin_obter_metricas_kesef(
  p_semanas integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz;
  v_resultado jsonb;
begin
  if not public.admin_tem_permissao('economy.read') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_semanas < 4 or p_semanas > 52 then
    raise exception 'JANELA_INVALIDA';
  end if;

  v_inicio := date_trunc('week', now()) - make_interval(weeks => p_semanas - 1);

  with
  creditos_regulares as (
    select k.usuario_id, k.quantidade, k.tipo, k.criado_em,
           date_trunc('week', k.criado_em) as semana
    from public.kesef_ledger k
    where k.criado_em >= v_inicio
      and k.quantidade > 0
      and k.tipo in ('oracao', 'licao', 'quiz_acerto', 'streak_bonus_7', 'streak_bonus_30', 'indicacao')
  ),
  emissao_usuario_semana as (
    select usuario_id, semana, sum(quantidade)::numeric as emissao
    from creditos_regulares group by usuario_id, semana
  ),
  frequencia as (
    select usuario_id, count(distinct semana)::integer as semanas_com_emissao
    from emissao_usuario_semana group by usuario_id
  ),
  saldos as (
    select u.id as usuario_id, coalesce(sum(k.quantidade), 0)::numeric as saldo
    from public.usuarios u
    left join public.kesef_ledger k on k.usuario_id = u.id
    group by u.id
  ),
  saldos_ordenados as (
    select saldo, row_number() over (order by saldo) as posicao,
           count(*) over ()::numeric as total_membros,
           sum(saldo) over ()::numeric as saldo_total
    from saldos where saldo > 0
  ),
  tipos as (
    select k.tipo, count(*)::integer as movimentos,
           sum(k.quantidade)::integer as quantidade_liquida,
           sum(greatest(k.quantidade, 0))::integer as creditos,
           abs(sum(least(k.quantidade, 0)))::integer as debitos
    from public.kesef_ledger k
    where k.criado_em >= v_inicio
    group by k.tipo
  )
  select jsonb_build_object(
    'gerado_em', now(),
    'inicio_em', v_inicio,
    'semanas', p_semanas,
    'emissao', jsonb_build_object(
      'total', coalesce((select sum(quantidade) from creditos_regulares), 0),
      'membros', (select count(distinct usuario_id) from creditos_regulares),
      'mediana_semanal', coalesce((select percentile_cont(0.5) within group (order by emissao) from emissao_usuario_semana), 0),
      'p25_semanal', coalesce((select percentile_cont(0.25) within group (order by emissao) from emissao_usuario_semana), 0),
      'p75_semanal', coalesce((select percentile_cont(0.75) within group (order by emissao) from emissao_usuario_semana), 0),
      'p90_semanal', coalesce((select percentile_cont(0.90) within group (order by emissao) from emissao_usuario_semana), 0)
    ),
    'segmentos', jsonb_build_object(
      'recorrentes', (select count(*) from frequencia where semanas_com_emissao >= 2),
      'ocasionais', (select count(*) from frequencia where semanas_com_emissao = 1)
    ),
    'saldos', jsonb_build_object(
      'total', coalesce((select sum(saldo) from saldos), 0),
      'mediana', coalesce((select percentile_cont(0.5) within group (order by saldo) from saldos), 0),
      'p90', coalesce((select percentile_cont(0.9) within group (order by saldo) from saldos), 0),
      'top_10_percentual', coalesce((
        select round(100 * sum(saldo) filter (where posicao > total_membros * 0.9) / nullif(max(saldo_total), 0), 2)
        from saldos_ordenados
      ), 0),
      'gini', coalesce((
        select round(sum((2 * posicao - total_membros - 1) * saldo) / nullif(total_membros * max(saldo_total), 0), 4)
        from saldos_ordenados
      ), 0)
    ),
    'movimentacao', jsonb_build_object(
      'emitido_regular', coalesce((select sum(quantidade) from creditos_regulares), 0),
      'debitado', coalesce((select abs(sum(quantidade)) from public.kesef_ledger where criado_em >= v_inicio and quantidade < 0), 0),
      'taxa_drenagem', coalesce((
        select round(
          abs(coalesce((select sum(quantidade) from public.kesef_ledger where criado_em >= v_inicio and quantidade < 0), 0))::numeric
          / nullif((select sum(quantidade) from creditos_regulares), 0), 4
        )
      ), 0)
    ),
    'tipos', coalesce((select jsonb_agg(to_jsonb(tipos) order by tipo) from tipos), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.cantina_criar_evento(text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, integer) from public;
grant execute on function public.cantina_criar_evento(text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, integer) to authenticated;
revoke all on function public.admin_obter_metricas_kesef(integer) from public;
grant execute on function public.admin_obter_metricas_kesef(integer) to authenticated;

grant select on public.cantina_eventos to authenticated;
grant select on public.cantina_evento_equipe to authenticated;

