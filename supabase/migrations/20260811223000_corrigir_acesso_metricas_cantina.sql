-- Resolve a autorização das métricas diretamente pela identidade autenticada.

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
  v_usuario_id uuid;
  v_papel text;
begin
  select u.id, coalesce(u.papel, 'membro')
    into v_usuario_id, v_papel
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_usuario_id is null or not (
    v_papel = 'admin'
    or exists (
      select 1
      from public.admin_role_assignments ra
      join public.admin_role_permissions rp on rp.role_code = ra.role_code
      where ra.usuario_id = v_usuario_id
        and ra.active = true
        and rp.permission_code in ('economy.read', 'canteen.reports.read')
    )
  ) then
    raise exception using errcode = '42501', message = 'PERMISSAO_NEGADA';
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
    'gerado_em', now(), 'inicio_em', v_inicio, 'semanas', p_semanas,
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
      'top_10_percentual', coalesce((select round(100 * sum(saldo) filter (where posicao > total_membros * 0.9) / nullif(max(saldo_total), 0), 2) from saldos_ordenados), 0),
      'gini', coalesce((select round(sum((2 * posicao - total_membros - 1) * saldo) / nullif(total_membros * max(saldo_total), 0), 4) from saldos_ordenados), 0)
    ),
    'movimentacao', jsonb_build_object(
      'emitido_regular', coalesce((select sum(quantidade) from creditos_regulares), 0),
      'debitado', coalesce((select abs(sum(quantidade)) from public.kesef_ledger where criado_em >= v_inicio and quantidade < 0), 0),
      'taxa_drenagem', coalesce((select round(abs(coalesce((select sum(quantidade) from public.kesef_ledger where criado_em >= v_inicio and quantidade < 0), 0))::numeric / nullif((select sum(quantidade) from creditos_regulares), 0), 4)), 0)
    ),
    'tipos', coalesce((select jsonb_agg(to_jsonb(tipos) order by tipo) from tipos), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.admin_obter_metricas_kesef(integer) from public, anon;
grant execute on function public.admin_obter_metricas_kesef(integer) to authenticated;

