-- Idempotência de recompensa em intercessões e orações:
-- Impede que um usuário farme Kesef e XP alternando (toggle) repetidamente
-- a ação de intercessão em um mesmo pedido de oração.

create or replace function public.creditar_kesef(
  p_usuario_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_referencia_id uuid default null
)
returns public.kesef_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_creditado_hoje integer;
  v_cap constant integer := 60;
  v_final integer := p_quantidade;
  v_registro public.kesef_ledger;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust')
     and not (p_tipo = 'indicacao' and public.admin_tem_permissao('people.manage')) then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  perform 1 from public.usuarios u where u.id = p_usuario_id for update;
  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;

  -- Se for oração e já tiver sido concedido para este pedido (referencia_id), retorna o registro existente
  if p_tipo = 'oracao' and p_referencia_id is not null then
    select * into v_registro
    from public.kesef_ledger k
    where k.usuario_id = p_usuario_id
      and k.tipo = p_tipo
      and k.referencia_id = p_referencia_id
    order by k.criado_em asc
    limit 1;

    if found then
      return v_registro;
    end if;
  end if;

  select coalesce(sum(k.quantidade), 0)::integer into v_creditado_hoje
  from public.kesef_ledger k
  where k.usuario_id = p_usuario_id
    and k.tipo <> 'resgate'
    and k.criado_em >= pg_catalog.date_trunc('day', pg_catalog.now());

  if v_creditado_hoje >= v_cap then raise exception 'CAP_DIARIO_ATINGIDO'; end if;
  if v_creditado_hoje + p_quantidade > v_cap then
    v_final := v_cap - v_creditado_hoje;
  end if;

  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (p_usuario_id, p_tipo, v_final, p_referencia_id)
  returning * into v_registro;
  return v_registro;
end;
$$;

revoke all on function public.creditar_kesef(uuid, text, integer, uuid) from public, anon;
grant execute on function public.creditar_kesef(uuid, text, integer, uuid) to authenticated;

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
  v_ref_uuid uuid;
begin
  if v_actor is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_usuario_id is distinct from v_actor
     and not public.admin_tem_permissao('economy.adjust') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  -- Se for referência de oração e já constar no kesef_ledger, não credita XP duplicado
  if p_referencia_id is not null then
    begin
      v_ref_uuid := p_referencia_id::uuid;
      if exists (
        select 1 from public.kesef_ledger k
        where k.usuario_id = p_usuario_id
          and k.tipo = 'oracao'
          and k.referencia_id = v_ref_uuid
      ) then
        select u.xp into v_novo_xp from public.usuarios u where u.id = p_usuario_id;
        return coalesce(v_novo_xp, 0);
      end if;
    exception when others then
      null;
    end;
  end if;

  update public.usuarios u
  set xp = u.xp + p_quantidade,
      ultima_atividade = pg_catalog.now()
  where u.id = p_usuario_id
  returning u.xp into v_novo_xp;

  if not found then raise exception 'USUARIO_NAO_ENCONTRADO'; end if;
  return v_novo_xp;
end;
$$;

revoke all on function public.creditar_xp(uuid, integer, text) from public, anon;
grant execute on function public.creditar_xp(uuid, integer, text) to authenticated;
