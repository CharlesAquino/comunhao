-- Alinha as operações administrativas legadas à governança por permissões.
-- Esta migration apenas prepara o schema; não é aplicada automaticamente.

create or replace function public.admin_listar_metricas_contatos()
returns table (
  id uuid,
  nome text,
  telefone text,
  foto_url text,
  status_anel text,
  pontos_comunhao integer,
  streak_dias integer,
  papel text,
  participa_sorteio boolean,
  last_login timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pode_ver_sensiveis boolean := public.admin_tem_permissao('people.sensitive');
begin
  if not public.admin_tem_permissao('people.read') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  return query
  select
    u.id,
    u.nome::text,
    case when v_pode_ver_sensiveis then u.telefone::text else null::text end,
    u.foto_url::text,
    u.status_anel::text,
    u.pontos_comunhao::integer,
    u.streak_dias::integer,
    u.papel::text,
    u.participa_sorteio,
    u.last_login
  from public.usuarios u
  order by u.nome;
end;
$$;

create or replace function public.admin_listar_contatos_duplas()
returns table (id uuid, nome text, telefone text, orando_por_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  return query
  select u.id, u.nome::text, u.telefone::text, u.orando_por_id
  from public.usuarios u
  where u.orando_por_id is not null;
end;
$$;

create or replace function public.admin_atualizar_participacao_sorteio(
  p_usuario_id uuid,
  p_participa_sorteio boolean
)
returns public.usuarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario public.usuarios;
begin
  if not public.admin_tem_permissao('prayer.manage') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  update public.usuarios
  set participa_sorteio = p_participa_sorteio
  where id = p_usuario_id
  returning * into v_usuario;

  if v_usuario.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return v_usuario;
end;
$$;

create or replace function public.admin_listar_elegiveis_sorteio(
  p_last_login_min timestamptz
)
returns table (id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  return query
  select u.id
  from public.usuarios u
  where u.participa_sorteio = true
    and u.auth_user_id is not null
    and u.last_login >= p_last_login_min
  order by u.id;
end;
$$;

create or replace function public.admin_aplicar_sorteio_circulo(p_relacoes jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  with payload as (
    select
      (item->>'id')::uuid as id,
      (item->>'orando_por_id')::uuid as orando_por_id,
      (item->>'sendo_orado_por_id')::uuid as sendo_orado_por_id
    from jsonb_array_elements(p_relacoes) as item
  ),
  updated as (
    update public.usuarios u
    set
      orando_por_id = payload.orando_por_id,
      sendo_orado_por_id = payload.sendo_orado_por_id
    from payload
    where u.id = payload.id
    returning 1
  )
  select count(*)::integer into v_count from updated;

  return v_count;
end;
$$;

create or replace function public.admin_notificar_sorteio_circulo(p_usuario_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  if not public.admin_tem_permissao('prayer.draw') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
  select
    u.id,
    'sorteio_circulo',
    'Nova dupla da semana',
    'Sua missão desta semana é orar por ' || parceiro.nome || '.',
    '/',
    jsonb_build_object(
      'parceiro_id', parceiro.id,
      'parceiro_nome', parceiro.nome,
      'tipo', 'sorteio_circulo'
    )
  from public.usuarios u
  join public.usuarios parceiro on parceiro.id = u.orando_por_id
  where u.id = any(p_usuario_ids)
    and u.orando_por_id is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Mantém a proteção contra alterações diretas, mas permite que as RPCs
-- governadas atualizem apenas os campos correspondentes às suas permissões.
create or replace function public.proteger_campos_sensiveis_usuario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() <> 'authenticated' or public.usuario_atual_e_admin() then
    return new;
  end if;

  if new.auth_user_id is distinct from old.auth_user_id
     or new.telefone is distinct from old.telefone
     or new.username is distinct from old.username
     or new.username_normalizado is distinct from old.username_normalizado
     or new.email_recuperacao is distinct from old.email_recuperacao
     or new.telefone_verificado_em is distinct from old.telefone_verificado_em
     or new.papel is distinct from old.papel
     or new.pontos_comunhao is distinct from old.pontos_comunhao
     or new.xp is distinct from old.xp
     or new.streak_dias is distinct from old.streak_dias
     or new.codigo_indicacao is distinct from old.codigo_indicacao
     or new.indicado_por_id is distinct from old.indicado_por_id then
    raise exception 'SENSITIVE_PROFILE_FIELDS';
  end if;

  if new.participa_sorteio is distinct from old.participa_sorteio
     and not public.admin_tem_permissao('prayer.manage') then
    raise exception 'PRAYER_MANAGE_PERMISSION_REQUIRED';
  end if;

  if (new.orando_por_id is distinct from old.orando_por_id
      or new.sendo_orado_por_id is distinct from old.sendo_orado_por_id)
     and not public.admin_tem_permissao('prayer.draw') then
    raise exception 'PRAYER_DRAW_PERMISSION_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.admin_listar_metricas_contatos() from public;
grant execute on function public.admin_listar_metricas_contatos() to authenticated;
revoke all on function public.admin_listar_contatos_duplas() from public;
grant execute on function public.admin_listar_contatos_duplas() to authenticated;
revoke all on function public.admin_atualizar_participacao_sorteio(uuid, boolean) from public;
grant execute on function public.admin_atualizar_participacao_sorteio(uuid, boolean) to authenticated;
revoke all on function public.admin_listar_elegiveis_sorteio(timestamptz) from public;
grant execute on function public.admin_listar_elegiveis_sorteio(timestamptz) to authenticated;
revoke all on function public.admin_aplicar_sorteio_circulo(jsonb) from public;
grant execute on function public.admin_aplicar_sorteio_circulo(jsonb) to authenticated;
revoke all on function public.admin_notificar_sorteio_circulo(uuid[]) from public;
grant execute on function public.admin_notificar_sorteio_circulo(uuid[]) to authenticated;

-- Identificadores de autenticação, indicação e atividade não integram o
-- contrato comunitário. O cliente obtém a própria identidade por
-- usuario_atual_id() e métricas administrativas pelas RPCs autorizadas.
revoke select (
  auth_user_id,
  codigo_indicacao,
  indicado_por_id,
  ultima_verificacao,
  last_login
) on table public.usuarios from authenticated;
