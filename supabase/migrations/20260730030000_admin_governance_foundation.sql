-- Fundação administrativa do Comunhão:
-- papéis funcionais, permissões, auditoria e resumo do painel.

create table if not exists public.admin_roles (
  code text primary key,
  name text not null,
  description text not null default '',
  system_role boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_permissions (
  code text primary key,
  module text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_role_permissions (
  role_code text not null references public.admin_roles(code) on delete cascade,
  permission_code text not null references public.admin_permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_code, permission_code)
);

create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  role_code text not null references public.admin_roles(code) on delete restrict,
  active boolean not null default true,
  assigned_by uuid references public.usuarios(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, role_code)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.usuarios(id) on delete set null,
  permission text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id uuid not null default gen_random_uuid(),
  status text not null default 'success' check (status in ('success', 'failure')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_role_assignments_user
  on public.admin_role_assignments(usuario_id, active);
create index if not exists idx_admin_audit_created_at
  on public.admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_entity
  on public.admin_audit_log(entity_type, entity_id, created_at desc);

insert into public.admin_roles (code, name, description) values
  ('administrador', 'Administrador', 'Controle integral da plataforma.'),
  ('guardiao', 'Guardião', 'Moderação e operações delegadas da comunidade.'),
  ('editor_ebd', 'Editor EBD', 'Criação e edição de conteúdo editorial.'),
  ('revisor_ebd', 'Revisor EBD', 'Revisão, aprovação e publicação editorial.'),
  ('operador_loja', 'Operador da loja', 'Catálogo, estoque, pedidos e entregas.'),
  ('pastoral', 'Responsável pastoral', 'Acompanhamento de pessoas e oração.'),
  ('tecnico', 'Operador técnico', 'Notificações, jobs, auditoria e saúde do sistema.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.admin_permissions (code, module, description) values
  ('admin.access', 'admin', 'Acessar a central administrativa.'),
  ('dashboard.read', 'dashboard', 'Visualizar o resumo administrativo.'),
  ('people.read', 'people', 'Listar e consultar usuários.'),
  ('people.manage', 'people', 'Editar situações administrativas de usuários.'),
  ('people.roles', 'people', 'Atribuir e remover papéis administrativos.'),
  ('people.sensitive', 'people', 'Visualizar contatos e informações pastorais sensíveis.'),
  ('prayer.read', 'prayer', 'Visualizar operações de oração.'),
  ('prayer.manage', 'prayer', 'Administrar sessões e elegibilidade.'),
  ('prayer.draw', 'prayer', 'Executar o sorteio do círculo de oração.'),
  ('moderation.read', 'moderation', 'Visualizar filas de moderação.'),
  ('moderation.manage', 'moderation', 'Ocultar, restaurar e moderar conteúdo.'),
  ('ebd.read', 'ebd', 'Visualizar o Estúdio Editorial.'),
  ('ebd.manage', 'ebd', 'Criar e editar lições e blocos.'),
  ('ebd.review', 'ebd', 'Revisar e solicitar alterações.'),
  ('ebd.publish', 'ebd', 'Aprovar e publicar lições.'),
  ('knowledge.read', 'knowledge', 'Visualizar fontes da memória sistêmica.'),
  ('knowledge.manage', 'knowledge', 'Enviar, editar, reindexar e arquivar fontes.'),
  ('store.read', 'store', 'Visualizar catálogo e pedidos.'),
  ('store.manage', 'store', 'Administrar catálogo, estoque e pedidos.'),
  ('economy.read', 'economy', 'Visualizar saldos e movimentações.'),
  ('economy.adjust', 'economy', 'Ajustar ou estornar Kesef e XP.'),
  ('notifications.read', 'notifications', 'Visualizar notificações e entregas.'),
  ('notifications.manage', 'notifications', 'Enviar, cancelar e reprocessar notificações.'),
  ('audit.read', 'audit', 'Visualizar a auditoria administrativa.'),
  ('system.read', 'system', 'Visualizar jobs e saúde da plataforma.'),
  ('system.manage', 'system', 'Executar operações técnicas e alterar parâmetros.')
on conflict (code) do update set
  module = excluded.module,
  description = excluded.description;

insert into public.admin_role_permissions (role_code, permission_code)
select 'administrador', code from public.admin_permissions
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code) values
  ('guardiao', 'admin.access'), ('guardiao', 'dashboard.read'),
  ('guardiao', 'people.read'),
  ('guardiao', 'prayer.read'), ('guardiao', 'prayer.manage'),
  ('guardiao', 'moderation.read'), ('guardiao', 'moderation.manage'),
  ('guardiao', 'notifications.read'),

  ('editor_ebd', 'admin.access'), ('editor_ebd', 'dashboard.read'),
  ('editor_ebd', 'ebd.read'), ('editor_ebd', 'ebd.manage'),
  ('editor_ebd', 'knowledge.read'),

  ('revisor_ebd', 'admin.access'), ('revisor_ebd', 'dashboard.read'),
  ('revisor_ebd', 'ebd.read'), ('revisor_ebd', 'ebd.review'), ('revisor_ebd', 'ebd.publish'),
  ('revisor_ebd', 'knowledge.read'),

  ('operador_loja', 'admin.access'), ('operador_loja', 'dashboard.read'),
  ('operador_loja', 'store.read'), ('operador_loja', 'store.manage'),
  ('operador_loja', 'economy.read'),

  ('pastoral', 'admin.access'), ('pastoral', 'dashboard.read'),
  ('pastoral', 'people.read'), ('pastoral', 'people.sensitive'),
  ('pastoral', 'prayer.read'),

  ('tecnico', 'admin.access'), ('tecnico', 'dashboard.read'),
  ('tecnico', 'notifications.read'), ('tecnico', 'notifications.manage'),
  ('tecnico', 'audit.read'), ('tecnico', 'system.read'), ('tecnico', 'system.manage')
on conflict do nothing;

create or replace function public.admin_tem_permissao(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_legacy_role text;
begin
  select u.id, coalesce(u.papel, 'membro')
    into v_user_id, v_legacy_role
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  if v_legacy_role = 'admin' then
    return true;
  end if;

  if v_legacy_role = 'mod' and exists (
    select 1
    from public.admin_role_permissions rp
    where rp.role_code = 'guardiao'
      and rp.permission_code = p_permission
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.admin_role_assignments ra
    join public.admin_role_permissions rp on rp.role_code = ra.role_code
    where ra.usuario_id = v_user_id
      and ra.active = true
      and rp.permission_code = p_permission
  );
end;
$$;

revoke all on function public.admin_tem_permissao(text) from public;
grant execute on function public.admin_tem_permissao(text) to authenticated;

create or replace function public.admin_obter_acesso_atual()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_legacy_role text;
  v_roles text[] := array[]::text[];
  v_permissions text[] := array[]::text[];
begin
  select u.id, coalesce(u.papel, 'membro')
    into v_user_id, v_legacy_role
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_user_id is null then
    return jsonb_build_object(
      'user_id', null,
      'legacy_role', 'membro',
      'roles', '[]'::jsonb,
      'permissions', '[]'::jsonb
    );
  end if;

  select coalesce(array_agg(distinct role_code order by role_code), array[]::text[])
    into v_roles
  from (
    select ra.role_code
    from public.admin_role_assignments ra
    where ra.usuario_id = v_user_id and ra.active = true
    union all
    select 'administrador' where v_legacy_role = 'admin'
    union all
    select 'guardiao' where v_legacy_role = 'mod'
  ) roles;

  if v_legacy_role = 'admin' then
    select coalesce(array_agg(p.code order by p.code), array[]::text[])
      into v_permissions
    from public.admin_permissions p;
  else
    select coalesce(array_agg(distinct rp.permission_code order by rp.permission_code), array[]::text[])
      into v_permissions
    from unnest(v_roles) as vr(role_code)
    join public.admin_role_permissions rp on rp.role_code = vr.role_code;
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'legacy_role', v_legacy_role,
    'roles', to_jsonb(v_roles),
    'permissions', to_jsonb(v_permissions)
  );
end;
$$;

revoke all on function public.admin_obter_acesso_atual() from public;
grant execute on function public.admin_obter_acesso_atual() to authenticated;

create or replace function public.admin_obter_resumo()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_users_total bigint := 0;
  v_users_active bigint := 0;
  v_prayer_requests bigint := 0;
  v_store_pending bigint := 0;
  v_editorial_review bigint := 0;
  v_rag_processing bigint := 0;
  v_rag_errors bigint := 0;
  v_push_failures bigint := 0;
  v_open_prayer_sessions bigint := 0;
begin
  if not public.admin_tem_permissao('dashboard.read') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;

  select count(*), count(*) filter (where u.last_login >= now() - interval '15 days')
    into v_users_total, v_users_active
  from public.usuarios u;

  if to_regclass('public.pedidos') is not null then
    execute 'select count(*) from public.pedidos' into v_prayer_requests;
  end if;
  if to_regclass('public.loja_pedidos') is not null then
    execute 'select count(*) from public.loja_pedidos where status = ''pendente''' into v_store_pending;
  end if;
  if to_regclass('public.ebd_editorial_lessons') is not null then
    execute 'select count(*) from public.ebd_editorial_lessons where status = ''review''' into v_editorial_review;
  end if;
  if to_regclass('public.plataforma_fontes_conhecimento') is not null then
    execute 'select count(*) from public.plataforma_fontes_conhecimento where status = ''processing''' into v_rag_processing;
    execute 'select count(*) from public.plataforma_fontes_conhecimento where status = ''error''' into v_rag_errors;
  end if;
  if to_regclass('public.push_entregas') is not null then
    execute 'select count(*) from public.push_entregas where status = ''falhou''' into v_push_failures;
  end if;
  if to_regclass('public.sessoes_oracao_grupo') is not null then
    execute 'select count(*) from public.sessoes_oracao_grupo where status = ''aberta''' into v_open_prayer_sessions;
  end if;

  return jsonb_build_object(
    'users_total', v_users_total,
    'users_active', v_users_active,
    'prayer_requests', v_prayer_requests,
    'store_pending', v_store_pending,
    'editorial_review', v_editorial_review,
    'rag_processing', v_rag_processing,
    'rag_errors', v_rag_errors,
    'push_failures', v_push_failures,
    'open_prayer_sessions', v_open_prayer_sessions
  );
end;
$$;

revoke all on function public.admin_obter_resumo() from public;
grant execute on function public.admin_obter_resumo() to authenticated;

create or replace function public.admin_atribuir_papel(
  p_usuario_id uuid,
  p_role_code text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
  v_assignment_id uuid;
begin
  if not public.admin_tem_permissao('people.roles') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'REASON_REQUIRED';
  end if;

  insert into public.admin_role_assignments (usuario_id, role_code, active, assigned_by, reason, updated_at)
  values (p_usuario_id, p_role_code, true, v_actor, trim(p_reason), now())
  on conflict (usuario_id, role_code)
  do update set active = true, assigned_by = excluded.assigned_by, reason = excluded.reason, updated_at = now()
  returning id into v_assignment_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor, 'people.roles', 'role.assign', 'usuario', p_usuario_id::text,
    jsonb_build_object('role_code', p_role_code, 'active', true), trim(p_reason)
  );

  return v_assignment_id;
end;
$$;

create or replace function public.admin_remover_papel(
  p_usuario_id uuid,
  p_role_code text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
begin
  if not public.admin_tem_permissao('people.roles') then
    raise exception 'ADMIN_PERMISSION_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'REASON_REQUIRED';
  end if;

  update public.admin_role_assignments
  set active = false, assigned_by = v_actor, reason = trim(p_reason), updated_at = now()
  where usuario_id = p_usuario_id and role_code = p_role_code;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, before_data, reason
  ) values (
    v_actor, 'people.roles', 'role.remove', 'usuario', p_usuario_id::text,
    jsonb_build_object('role_code', p_role_code, 'active', true), trim(p_reason)
  );
end;
$$;

revoke all on function public.admin_atribuir_papel(uuid, text, text) from public;
grant execute on function public.admin_atribuir_papel(uuid, text, text) to authenticated;
revoke all on function public.admin_remover_papel(uuid, text, text) from public;
grant execute on function public.admin_remover_papel(uuid, text, text) to authenticated;

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_role_assignments enable row level security;
alter table public.admin_audit_log enable row level security;

create policy admin_roles_read on public.admin_roles
  for select to authenticated using (public.admin_tem_permissao('admin.access'));
create policy admin_permissions_read on public.admin_permissions
  for select to authenticated using (public.admin_tem_permissao('admin.access'));
create policy admin_role_permissions_read on public.admin_role_permissions
  for select to authenticated using (public.admin_tem_permissao('admin.access'));
create policy admin_role_assignments_read on public.admin_role_assignments
  for select to authenticated using (public.admin_tem_permissao('people.roles'));
create policy admin_audit_read on public.admin_audit_log
  for select to authenticated using (public.admin_tem_permissao('audit.read'));

comment on table public.admin_audit_log is
  'Registro imutável de ações administrativas. Escrita somente por funções server-side e RPCs governadas.';

-- O Estúdio e a Memória passam a respeitar permissões funcionais.
drop policy if exists "ebd_editorial_publicados_select" on public.ebd_editorial_lessons;
drop policy if exists "ebd_editorial_admin_all" on public.ebd_editorial_lessons;
create policy ebd_editorial_select_by_permission
on public.ebd_editorial_lessons for select to authenticated
using (status = 'published' or public.admin_tem_permissao('ebd.read'));
create policy ebd_editorial_insert_by_permission
on public.ebd_editorial_lessons for insert to authenticated
with check (public.admin_tem_permissao('ebd.manage'));
create policy ebd_editorial_update_by_permission
on public.ebd_editorial_lessons for update to authenticated
using (
  public.admin_tem_permissao('ebd.manage')
  or public.admin_tem_permissao('ebd.review')
  or public.admin_tem_permissao('ebd.publish')
)
with check (
  public.admin_tem_permissao('ebd.manage')
  or public.admin_tem_permissao('ebd.review')
  or public.admin_tem_permissao('ebd.publish')
);
create policy ebd_editorial_delete_by_permission
on public.ebd_editorial_lessons for delete to authenticated
using (public.admin_tem_permissao('ebd.manage'));

drop policy if exists "ebd_editorial_versions_admin_select" on public.ebd_editorial_versions;
create policy ebd_editorial_versions_select_by_permission
on public.ebd_editorial_versions for select to authenticated
using (public.admin_tem_permissao('ebd.read'));

drop policy if exists "fontes_conhecimento_admin_all" on public.plataforma_fontes_conhecimento;
create policy fontes_conhecimento_select_by_permission
on public.plataforma_fontes_conhecimento for select to authenticated
using (public.admin_tem_permissao('knowledge.read'));
create policy fontes_conhecimento_insert_by_permission
on public.plataforma_fontes_conhecimento for insert to authenticated
with check (public.admin_tem_permissao('knowledge.manage'));
create policy fontes_conhecimento_update_by_permission
on public.plataforma_fontes_conhecimento for update to authenticated
using (public.admin_tem_permissao('knowledge.manage'))
with check (public.admin_tem_permissao('knowledge.manage'));
create policy fontes_conhecimento_delete_by_permission
on public.plataforma_fontes_conhecimento for delete to authenticated
using (public.admin_tem_permissao('knowledge.manage'));

drop policy if exists "memoria_chunks_admin_select" on public.plataforma_memoria_chunks;
create policy memoria_chunks_select_by_permission
on public.plataforma_memoria_chunks for select to authenticated
using (public.admin_tem_permissao('knowledge.read'));

drop policy if exists "conhecimento_admin_select" on storage.objects;
create policy conhecimento_select_by_permission
on storage.objects for select to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and public.admin_tem_permissao('knowledge.read')
);

drop policy if exists "conhecimento_admin_insert" on storage.objects;
create policy conhecimento_insert_by_permission
on storage.objects for insert to authenticated
with check (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.admin_tem_permissao('knowledge.manage')
);

drop policy if exists "conhecimento_admin_update" on storage.objects;
create policy conhecimento_update_by_permission
on storage.objects for update to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.admin_tem_permissao('knowledge.manage')
)
with check (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.admin_tem_permissao('knowledge.manage')
);

drop policy if exists "conhecimento_admin_delete" on storage.objects;
create policy conhecimento_delete_by_permission
on storage.objects for delete to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and public.admin_tem_permissao('knowledge.manage')
);

create or replace function public.publicar_ebd_editorial(p_licao_id text)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
  v_licao public.ebd_editorial_lessons%rowtype;
  v_versao integer;
begin
  if not public.admin_tem_permissao('ebd.publish') then
    raise exception 'EBD_PUBLISH_PERMISSION_REQUIRED';
  end if;

  v_actor_id := public.usuario_atual_id();

  select * into v_licao
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    raise exception 'Lição editorial não encontrada';
  end if;

  if jsonb_array_length(coalesce(v_licao.documento->'days', '[]'::jsonb)) <> 7 then
    raise exception 'A lição precisa conter os sete dias antes da publicação';
  end if;

  v_versao := v_licao.versao + 1;

  insert into public.ebd_editorial_versions (
    licao_id, versao, documento, titulo, subtitulo, criado_por
  ) values (
    v_licao.id, v_versao, v_licao.documento, v_licao.titulo,
    v_licao.subtitulo, v_actor_id
  );

  update public.ebd_editorial_lessons
  set status = 'published', versao = v_versao, publicado_em = now()
  where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, before_data, after_data, reason
  ) values (
    v_actor_id,
    'ebd.publish',
    'ebd.publish',
    'ebd_editorial_lesson',
    p_licao_id,
    jsonb_build_object('status', v_licao.status, 'version', v_licao.versao),
    jsonb_build_object('status', 'published', 'version', v_versao),
    'Publicação editorial'
  );

  return v_versao;
end;
$$;

revoke all on function public.publicar_ebd_editorial(text) from public;
grant execute on function public.publicar_ebd_editorial(text) to authenticated;
