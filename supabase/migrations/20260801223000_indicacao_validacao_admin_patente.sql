-- Programa de indicação para todos os membros.
-- O bônus só é creditado após validação administrativa e cresce por patente.

begin;

create table if not exists public.indicacao_validacoes (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  indicador_id uuid references public.usuarios(id) on delete set null,
  validado_por_id uuid not null references public.usuarios(id) on delete restrict,
  validado_em timestamptz not null default now(),
  bonus_quantidade integer not null default 0 check (bonus_quantidade between 0 and 40),
  ledger_id uuid references public.kesef_ledger(id) on delete restrict,
  motivo text not null check (char_length(btrim(motivo)) >= 5)
);

alter table public.indicacao_validacoes enable row level security;
revoke all on table public.indicacao_validacoes from public, anon, authenticated;
grant select, insert, update, delete on table public.indicacao_validacoes to service_role;

create or replace function public.indicacao_bonus_por_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_xp, 0) < 300 then 5
    when p_xp < 800 then 10
    when p_xp < 1800 then 15
    when p_xp < 3500 then 20
    when p_xp < 6000 then 25
    when p_xp < 9500 then 30
    when p_xp < 18500 then 35
    else 40
  end;
$$;

revoke all on function public.indicacao_bonus_por_xp(integer) from public, anon;
grant execute on function public.indicacao_bonus_por_xp(integer) to authenticated, service_role;

-- Corrige o contrato auth.uid() -> usuarios.auth_user_id -> usuarios.id.
create or replace function public.gerar_codigo_indicacao()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_codigo text;
begin
  if v_usuario_id is null then
    raise exception 'USER_PROFILE_NOT_LINKED' using errcode = '42501';
  end if;

  select u.codigo_indicacao into v_codigo
  from public.usuarios u
  where u.id = v_usuario_id
  for update;

  if v_codigo is not null then
    return v_codigo;
  end if;

  loop
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.usuarios u where u.codigo_indicacao = v_codigo
    );
  end loop;

  update public.usuarios
  set codigo_indicacao = v_codigo
  where id = v_usuario_id;

  return v_codigo;
end;
$$;

revoke all on function public.gerar_codigo_indicacao() from public, anon;
grant execute on function public.gerar_codigo_indicacao() to authenticated;

create or replace function public.registrar_indicacao(p_codigo_indicacao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_indicador_id uuid;
  v_indicador_atual uuid;
begin
  if v_usuario_id is null then
    raise exception 'USER_PROFILE_NOT_LINKED' using errcode = '42501';
  end if;

  select u.id into v_indicador_id
  from public.usuarios u
  where u.codigo_indicacao = upper(trim(p_codigo_indicacao));

  if v_indicador_id is null then
    raise exception 'CODIGO_INVALIDO' using errcode = '22023';
  end if;
  if v_indicador_id = v_usuario_id then
    raise exception 'AUTO_INDICACAO' using errcode = '22023';
  end if;
  if exists (select 1 from public.indicacao_validacoes v where v.usuario_id = v_usuario_id) then
    raise exception 'MEMBRO_JA_VALIDADO' using errcode = '55000';
  end if;

  select u.indicado_por_id into v_indicador_atual
  from public.usuarios u
  where u.id = v_usuario_id
  for update;

  if v_indicador_atual is not null and v_indicador_atual <> v_indicador_id then
    raise exception 'INDICACAO_JA_REGISTRADA' using errcode = '55000';
  end if;

  update public.usuarios
  set indicado_por_id = v_indicador_id
  where id = v_usuario_id;
end;
$$;

revoke all on function public.registrar_indicacao(text) from public, anon;
grant execute on function public.registrar_indicacao(text) to authenticated, service_role;

-- O gatilho legado de primeira oração deixa de conceder bônus.
create or replace function public.creditar_bonus_indicacao()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  return;
end;
$$;

revoke all on function public.creditar_bonus_indicacao() from public, anon, authenticated;

create or replace function public.obter_programa_indicacao()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_codigo text;
  v_xp integer;
begin
  if v_usuario_id is null then
    raise exception 'USER_PROFILE_NOT_LINKED' using errcode = '42501';
  end if;

  v_codigo := public.gerar_codigo_indicacao();
  select coalesce(u.xp, 0) into v_xp from public.usuarios u where u.id = v_usuario_id;

  return jsonb_build_object(
    'codigo', v_codigo,
    'bonus', public.indicacao_bonus_por_xp(v_xp)
  );
end;
$$;

revoke all on function public.obter_programa_indicacao() from public, anon;
grant execute on function public.obter_programa_indicacao() to authenticated;

create or replace function public.admin_listar_validacoes_indicacao()
returns table (usuario_id uuid, validado_em timestamptz, bonus_quantidade integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('people.read') then
    raise exception 'ADMIN_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  return query
  select v.usuario_id, v.validado_em, v.bonus_quantidade
  from public.indicacao_validacoes v;
end;
$$;

revoke all on function public.admin_listar_validacoes_indicacao() from public, anon;
grant execute on function public.admin_listar_validacoes_indicacao() to authenticated;

create or replace function public.admin_validar_membro_indicado(
  p_usuario_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_indicador_id uuid;
  v_indicador_xp integer;
  v_bonus integer := 0;
  v_creditado_hoje integer := 0;
  v_ledger_id uuid;
  v_inseriu uuid;
begin
  if not public.admin_tem_permissao('people.manage') then
    raise exception 'ADMIN_PERMISSION_REQUIRED' using errcode = '42501';
  end if;
  if v_actor is null then
    raise exception 'USER_PROFILE_NOT_LINKED' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;

  select u.indicado_por_id into v_indicador_id
  from public.usuarios u
  where u.id = p_usuario_id
  for update;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_indicador_id is not null then
    select coalesce(u.xp, 0) into v_indicador_xp
    from public.usuarios u
    where u.id = v_indicador_id;
    v_bonus := public.indicacao_bonus_por_xp(v_indicador_xp);

    select coalesce(sum(k.quantidade), 0)::integer into v_creditado_hoje
    from public.kesef_ledger k
    where k.usuario_id = v_indicador_id
      and k.tipo <> 'resgate'
      and k.criado_em >= date_trunc('day', now());

    if v_creditado_hoje + v_bonus > 60 then
      raise exception 'CAP_DIARIO_INSUFICIENTE_PARA_INDICACAO' using errcode = '55000';
    end if;
  end if;

  insert into public.indicacao_validacoes (
    usuario_id, indicador_id, validado_por_id, bonus_quantidade, motivo
  ) values (
    p_usuario_id, v_indicador_id, v_actor, v_bonus, trim(p_motivo)
  )
  on conflict (usuario_id) do nothing
  returning usuario_id into v_inseriu;

  if v_inseriu is null then
    raise exception 'MEMBRO_JA_VALIDADO' using errcode = '55000';
  end if;

  if v_indicador_id is not null then
    select credito.id into v_ledger_id
    from public.creditar_kesef(v_indicador_id, 'indicacao', v_bonus, p_usuario_id) credito;

    update public.indicacao_validacoes
    set ledger_id = v_ledger_id
    where usuario_id = p_usuario_id;
  end if;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor,
    'people.manage',
    'member.validate',
    'usuario',
    p_usuario_id::text,
    jsonb_build_object('indicador_id', v_indicador_id, 'bonus_quantidade', v_bonus),
    trim(p_motivo)
  );

  return jsonb_build_object(
    'usuario_id', p_usuario_id,
    'indicador_id', v_indicador_id,
    'bonus', v_bonus,
    'validado_em', now()
  );
end;
$$;

revoke all on function public.admin_validar_membro_indicado(uuid, text) from public, anon;
grant execute on function public.admin_validar_membro_indicado(uuid, text) to authenticated;

-- Todos os perfis existentes recebem código, inclusive quem nunca abriu a Carteira.
do $$
declare
  v_usuario record;
  v_codigo text;
begin
  for v_usuario in
    select u.id from public.usuarios u where u.codigo_indicacao is null for update
  loop
    loop
      v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (
        select 1 from public.usuarios u where u.codigo_indicacao = v_codigo
      );
    end loop;
    update public.usuarios set codigo_indicacao = v_codigo where id = v_usuario.id;
  end loop;
end;
$$;

commit;
