-- Protocolo Sentinela — Fase 1
-- Hardening de operações administrativas, rate limiting, idempotência,
-- auditoria de segurança e transições editoriais protegidas.
--
-- Pré-requisitos esperados no projeto:
-- - public.usuarios
-- - public.admin_tem_permissao(text)
-- - public.usuario_atual_id()
-- - public.ebd_editorial_lessons
-- - public.ebd_editorial_versions
-- - public.admin_audit_log

begin;

-- ---------------------------------------------------------------------------
-- 1. Rate limiting server-side
-- ---------------------------------------------------------------------------

create table if not exists public.security_rate_limit_policies (
  action text primary key,
  max_requests integer not null check (max_requests between 1 and 100000),
  window_seconds integer not null check (window_seconds between 1 and 86400),
  block_seconds integer not null default 0 check (block_seconds between 0 and 604800),
  enabled boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.security_rate_limit_counters (
  action text not null references public.security_rate_limit_policies(action) on delete cascade,
  key_hash text not null check (char_length(key_hash) between 8 and 200),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (action, key_hash)
);

create index if not exists idx_security_rate_limit_updated_at
  on public.security_rate_limit_counters(updated_at);

insert into public.security_rate_limit_policies (
  action, max_requests, window_seconds, block_seconds, description
) values
  ('ebd.ai.generate', 12, 3600, 900, 'Geração editorial com IA por ator e origem.'),
  ('ebd.publish', 5, 3600, 1800, 'Publicação de lições EBD.'),
  ('ebd.review.submit', 20, 3600, 300, 'Envio de lições para revisão.'),
  ('ebd.review.return', 20, 3600, 300, 'Retorno de lições para rascunho.'),
  ('ebd.archive', 10, 3600, 900, 'Arquivamento de lições.'),
  ('rag.search', 60, 3600, 300, 'Consultas administrativas à memória RAG.'),
  ('rag.index', 10, 3600, 1800, 'Indexações de documentos da memória.'),
  ('admin.role.assign', 10, 3600, 1800, 'Atribuição de papéis administrativos.'),
  ('admin.role.remove', 10, 3600, 1800, 'Remoção de papéis administrativos.')
on conflict (action) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds,
  block_seconds = excluded.block_seconds,
  description = excluded.description,
  updated_at = now();

alter table public.security_rate_limit_policies enable row level security;
alter table public.security_rate_limit_counters enable row level security;

revoke all on table public.security_rate_limit_policies from public, anon, authenticated;
revoke all on table public.security_rate_limit_counters from public, anon, authenticated;
grant select, insert, update, delete on table public.security_rate_limit_policies to service_role;
grant select, insert, update, delete on table public.security_rate_limit_counters to service_role;

create or replace function public.security_consume_rate_limit(
  p_action text,
  p_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.security_rate_limit_policies%rowtype;
  v_counter public.security_rate_limit_counters%rowtype;
  v_now timestamptz := clock_timestamp();
  v_window_end timestamptz;
  v_retry_after integer;
  v_new_count integer;
begin
  if p_action is null or char_length(trim(p_action)) < 3 then
    raise exception using errcode = '22023', message = 'SECURITY_ACTION_INVALID';
  end if;

  if p_key_hash is null or char_length(trim(p_key_hash)) < 8 or char_length(p_key_hash) > 200 then
    raise exception using errcode = '22023', message = 'SECURITY_KEY_INVALID';
  end if;

  select *
    into v_policy
  from public.security_rate_limit_policies
  where action = p_action;

  if not found or not v_policy.enabled then
    return jsonb_build_object(
      'allowed', true,
      'remaining', null,
      'retry_after_seconds', 0,
      'policy_enabled', false
    );
  end if;

  insert into public.security_rate_limit_counters (
    action, key_hash, window_started_at, request_count, blocked_until, updated_at
  ) values (
    p_action, p_key_hash, v_now, 0, null, v_now
  )
  on conflict (action, key_hash) do nothing;

  select *
    into v_counter
  from public.security_rate_limit_counters
  where action = p_action and key_hash = p_key_hash
  for update;

  if v_counter.blocked_until is not null and v_counter.blocked_until > v_now then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_counter.blocked_until - v_now)))::integer);
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', v_retry_after,
      'policy_enabled', true
    );
  end if;

  v_window_end := v_counter.window_started_at + make_interval(secs => v_policy.window_seconds);

  if v_window_end <= v_now then
    update public.security_rate_limit_counters
       set window_started_at = v_now,
           request_count = 0,
           blocked_until = null,
           updated_at = v_now
     where action = p_action and key_hash = p_key_hash;

    v_counter.window_started_at := v_now;
    v_counter.request_count := 0;
    v_counter.blocked_until := null;
    v_window_end := v_now + make_interval(secs => v_policy.window_seconds);
  end if;

  if v_counter.request_count >= v_policy.max_requests then
    update public.security_rate_limit_counters
       set blocked_until = case
             when v_policy.block_seconds > 0
               then v_now + make_interval(secs => v_policy.block_seconds)
             else v_window_end
           end,
           updated_at = v_now
     where action = p_action and key_hash = p_key_hash
     returning greatest(
       1,
       ceil(extract(epoch from (coalesce(blocked_until, v_window_end) - v_now)))::integer
     ) into v_retry_after;

    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', v_retry_after,
      'policy_enabled', true
    );
  end if;

  update public.security_rate_limit_counters
     set request_count = request_count + 1,
         blocked_until = null,
         updated_at = v_now
   where action = p_action and key_hash = p_key_hash
   returning request_count into v_new_count;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, v_policy.max_requests - v_new_count),
    'retry_after_seconds', 0,
    'policy_enabled', true
  );
end;
$$;

revoke all on function public.security_consume_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.security_consume_rate_limit(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Idempotência para operações críticas
-- ---------------------------------------------------------------------------

create table if not exists public.security_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  actor_auth_uid uuid not null,
  action text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  request_hash text not null check (char_length(request_hash) between 16 and 160),
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  response_data jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (actor_auth_uid, action, idempotency_key)
);

create index if not exists idx_security_idempotency_expires
  on public.security_idempotency_keys(expires_at);

alter table public.security_idempotency_keys enable row level security;
revoke all on table public.security_idempotency_keys from public, anon, authenticated;
grant select, insert, update, delete on table public.security_idempotency_keys to service_role;

create or replace function public.security_begin_idempotent_operation(
  p_actor_auth_uid uuid,
  p_action text,
  p_idempotency_key text,
  p_request_hash text,
  p_ttl_seconds integer default 86400
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.security_idempotency_keys%rowtype;
  v_now timestamptz := clock_timestamp();
  v_inserted integer := 0;
  v_processing_timeout interval := interval '2 minutes';
begin
  if p_actor_auth_uid is null then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_ACTOR_REQUIRED';
  end if;
  if p_action is null or char_length(trim(p_action)) < 3 or char_length(p_action) > 120 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_ACTION_INVALID';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 16 or char_length(p_idempotency_key) > 160 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;
  if p_request_hash is null or char_length(p_request_hash) < 16 or char_length(p_request_hash) > 160 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_HASH_INVALID';
  end if;
  if p_ttl_seconds < 60 or p_ttl_seconds > 604800 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_TTL_INVALID';
  end if;

  insert into public.security_idempotency_keys (
    actor_auth_uid, action, idempotency_key, request_hash,
    status, created_at, updated_at, expires_at
  ) values (
    p_actor_auth_uid, trim(p_action), p_idempotency_key, p_request_hash,
    'processing', v_now, v_now, v_now + make_interval(secs => p_ttl_seconds)
  )
  on conflict (actor_auth_uid, action, idempotency_key) do nothing;

  get diagnostics v_inserted = row_count;

  select *
    into v_row
  from public.security_idempotency_keys
  where actor_auth_uid = p_actor_auth_uid
    and action = trim(p_action)
    and idempotency_key = p_idempotency_key
  for update;

  if v_inserted = 1 then
    return jsonb_build_object('state', 'acquired', 'cached', false);
  end if;

  if v_row.request_hash <> p_request_hash then
    return jsonb_build_object('state', 'conflict', 'cached', false);
  end if;

  if v_row.expires_at <= v_now
     or v_row.status = 'failed'
     or (v_row.status = 'processing' and v_row.updated_at <= v_now - v_processing_timeout) then
    update public.security_idempotency_keys
       set status = 'processing',
           response_data = null,
           error_code = null,
           request_hash = p_request_hash,
           updated_at = v_now,
           expires_at = v_now + make_interval(secs => p_ttl_seconds)
     where id = v_row.id;

    return jsonb_build_object('state', 'acquired', 'cached', false);
  end if;

  if v_row.status = 'completed' then
    return jsonb_build_object(
      'state', 'completed',
      'cached', true,
      'response_data', coalesce(v_row.response_data, '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'state', 'in_progress',
    'cached', false,
    'retry_after_seconds', greatest(
      1,
      ceil(extract(epoch from ((v_row.updated_at + v_processing_timeout) - v_now)))::integer
    )
  );
end;
$$;

create or replace function public.security_complete_idempotent_operation(
  p_actor_auth_uid uuid,
  p_action text,
  p_idempotency_key text,
  p_response_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.security_idempotency_keys
     set status = 'completed',
         response_data = coalesce(p_response_data, '{}'::jsonb),
         error_code = null,
         updated_at = clock_timestamp()
   where actor_auth_uid = p_actor_auth_uid
     and action = p_action
     and idempotency_key = p_idempotency_key
     and status = 'processing';
end;
$$;

create or replace function public.security_fail_idempotent_operation(
  p_actor_auth_uid uuid,
  p_action text,
  p_idempotency_key text,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.security_idempotency_keys
     set status = 'failed',
         response_data = null,
         error_code = left(coalesce(p_error_code, 'UNKNOWN'), 120),
         updated_at = clock_timestamp()
   where actor_auth_uid = p_actor_auth_uid
     and action = p_action
     and idempotency_key = p_idempotency_key
     and status = 'processing';
end;
$$;

revoke all on function public.security_begin_idempotent_operation(uuid, text, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.security_complete_idempotent_operation(uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.security_fail_idempotent_operation(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.security_begin_idempotent_operation(uuid, text, text, text, integer)
  to service_role;
grant execute on function public.security_complete_idempotent_operation(uuid, text, text, jsonb)
  to service_role;
grant execute on function public.security_fail_idempotent_operation(uuid, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Eventos de segurança sanitizados e append-only
-- ---------------------------------------------------------------------------

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null,
  actor_auth_uid uuid,
  action text not null check (char_length(action) between 3 and 120),
  resource_type text,
  resource_id_hash text,
  outcome text not null check (outcome in ('allowed', 'denied', 'failed', 'blocked')),
  risk_score smallint not null default 0 check (risk_score between 0 and 100),
  reason_code text,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'application'
);

create index if not exists idx_security_events_occurred
  on public.security_events(occurred_at desc);
create index if not exists idx_security_events_action
  on public.security_events(action, occurred_at desc);
create index if not exists idx_security_events_actor
  on public.security_events(actor_auth_uid, occurred_at desc)
  where actor_auth_uid is not null;

alter table public.security_events enable row level security;
revoke all on table public.security_events from public, anon, authenticated;
grant select, insert on table public.security_events to service_role;
grant select on table public.security_events to authenticated;

drop policy if exists security_events_read_by_auditor on public.security_events;
create policy security_events_read_by_auditor
on public.security_events for select to authenticated
using (public.admin_tem_permissao('audit.read'));

create or replace function public.security_record_event(
  p_correlation_id uuid,
  p_actor_auth_uid uuid,
  p_action text,
  p_resource_type text,
  p_resource_id_hash text,
  p_outcome text,
  p_risk_score integer,
  p_reason_code text,
  p_metadata jsonb default '{}'::jsonb,
  p_source text default 'application'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_correlation_id is null then
    raise exception using errcode = '22023', message = 'SECURITY_CORRELATION_REQUIRED';
  end if;
  if p_outcome not in ('allowed', 'denied', 'failed', 'blocked') then
    raise exception using errcode = '22023', message = 'SECURITY_OUTCOME_INVALID';
  end if;
  if octet_length(v_metadata::text) > 8192 then
    v_metadata := jsonb_build_object('truncated', true);
  end if;

  insert into public.security_events (
    correlation_id, actor_auth_uid, action, resource_type, resource_id_hash,
    outcome, risk_score, reason_code, metadata, source
  ) values (
    p_correlation_id,
    p_actor_auth_uid,
    left(trim(p_action), 120),
    nullif(left(trim(coalesce(p_resource_type, '')), 80), ''),
    nullif(left(trim(coalesce(p_resource_id_hash, '')), 200), ''),
    p_outcome,
    greatest(0, least(100, coalesce(p_risk_score, 0))),
    nullif(left(trim(coalesce(p_reason_code, '')), 120), ''),
    v_metadata,
    left(trim(coalesce(p_source, 'application')), 80)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.security_record_event(uuid, uuid, text, text, text, text, integer, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.security_record_event(uuid, uuid, text, text, text, text, integer, text, jsonb, text)
  to service_role;

create or replace function public.security_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'SECURITY_EVENTS_ARE_IMMUTABLE';
end;
$$;

drop trigger if exists trg_security_events_immutable on public.security_events;
create trigger trg_security_events_immutable
before update or delete on public.security_events
for each row execute function public.security_events_immutable();

-- ---------------------------------------------------------------------------
-- 4. Circuit breakers silenciosos para operações críticas
-- ---------------------------------------------------------------------------

create table if not exists public.security_circuit_breakers (
  action text primary key,
  enabled boolean not null default false,
  reason text not null default '',
  enabled_until timestamptz,
  updated_by uuid references public.usuarios(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.security_circuit_breakers(action) values
  ('ebd.ai.generate'), ('ebd.publish'), ('rag.search'), ('rag.index'),
  ('economy.write'), ('media.upload')
on conflict (action) do nothing;

alter table public.security_circuit_breakers enable row level security;
revoke all on table public.security_circuit_breakers from public, anon, authenticated;
grant select, insert, update on table public.security_circuit_breakers to service_role;
grant select on table public.security_circuit_breakers to authenticated;

drop policy if exists security_circuit_breakers_read on public.security_circuit_breakers;
create policy security_circuit_breakers_read
on public.security_circuit_breakers for select to authenticated
using (public.admin_tem_permissao('system.read'));

create or replace function public.security_is_circuit_open(p_action text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'open', enabled and (enabled_until is null or enabled_until > now()),
        'reason', case
          when enabled and (enabled_until is null or enabled_until > now()) then reason
          else ''
        end,
        'enabled_until', enabled_until
      )
      from public.security_circuit_breakers
      where action = p_action
    ),
    jsonb_build_object('open', false, 'reason', '', 'enabled_until', null)
  );
$$;

revoke all on function public.security_is_circuit_open(text) from public, anon, authenticated;
grant execute on function public.security_is_circuit_open(text) to service_role;

create or replace function public.security_set_circuit_breaker(
  p_action text,
  p_enabled boolean,
  p_reason text,
  p_enabled_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
begin
  if not public.admin_tem_permissao('system.manage') then
    raise exception using errcode = '42501', message = 'ADMIN_PERMISSION_REQUIRED';
  end if;
  if p_enabled and char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  insert into public.security_circuit_breakers (
    action, enabled, reason, enabled_until, updated_by, updated_at
  ) values (
    trim(p_action), p_enabled, trim(coalesce(p_reason, '')), p_enabled_until, v_actor, now()
  )
  on conflict (action) do update set
    enabled = excluded.enabled,
    reason = excluded.reason,
    enabled_until = excluded.enabled_until,
    updated_by = excluded.updated_by,
    updated_at = now();

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor,
    'system.manage',
    'security.circuit.set',
    'security_circuit_breaker',
    trim(p_action),
    jsonb_build_object('enabled', p_enabled, 'enabled_until', p_enabled_until),
    trim(coalesce(p_reason, ''))
  );
end;
$$;

revoke all on function public.security_set_circuit_breaker(text, boolean, text, timestamptz)
  from public, anon;
grant execute on function public.security_set_circuit_breaker(text, boolean, text, timestamptz)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Validação e máquina de estados do domínio EBD
-- ---------------------------------------------------------------------------

create or replace function public.ebd_validar_documento(p_documento jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_day jsonb;
  v_block jsonb;
  v_day_count integer := 0;
  v_block_count integer := 0;
  v_errors text[] := array[]::text[];
  v_allowed_types text[] := array[
    'hero', 'text', 'scripture', 'character', 'timeline',
    'reflection', 'mission', 'prayer', 'quiz', 'video'
  ];
begin
  if p_documento is null or jsonb_typeof(p_documento) <> 'object' then
    return jsonb_build_object('valid', false, 'errors', jsonb_build_array('DOCUMENT_NOT_OBJECT'));
  end if;

  if octet_length(p_documento::text) > 2097152 then
    v_errors := array_append(v_errors, 'DOCUMENT_TOO_LARGE');
  end if;

  if jsonb_typeof(p_documento->'days') <> 'array' then
    v_errors := array_append(v_errors, 'DAYS_NOT_ARRAY');
  else
    v_day_count := jsonb_array_length(p_documento->'days');
    if v_day_count <> 7 then
      v_errors := array_append(v_errors, 'DAYS_MUST_EQUAL_SEVEN');
    end if;

    for v_day in select value from jsonb_array_elements(p_documento->'days')
    loop
      if jsonb_typeof(v_day) <> 'object' then
        v_errors := array_append(v_errors, 'DAY_NOT_OBJECT');
        continue;
      end if;

      if jsonb_typeof(v_day->'blocks') <> 'array' then
        v_errors := array_append(v_errors, 'BLOCKS_NOT_ARRAY');
        continue;
      end if;

      if jsonb_array_length(v_day->'blocks') > 50 then
        v_errors := array_append(v_errors, 'TOO_MANY_BLOCKS');
      end if;

      for v_block in select value from jsonb_array_elements(v_day->'blocks')
      loop
        v_block_count := v_block_count + 1;
        if jsonb_typeof(v_block) <> 'object' then
          v_errors := array_append(v_errors, 'BLOCK_NOT_OBJECT');
          continue;
        end if;
        if coalesce(v_block->>'type', '') <> all(v_allowed_types) then
          v_errors := array_append(v_errors, 'BLOCK_TYPE_NOT_ALLOWED');
        end if;
      end loop;
    end loop;
  end if;

  if v_block_count > 350 then
    v_errors := array_append(v_errors, 'LESSON_TOO_MANY_BLOCKS');
  end if;

  return jsonb_build_object(
    'valid', cardinality(v_errors) = 0,
    'errors', to_jsonb(v_errors),
    'days', v_day_count,
    'blocks', v_block_count
  );
end;
$$;

revoke all on function public.ebd_validar_documento(jsonb) from public, anon;
grant execute on function public.ebd_validar_documento(jsonb) to authenticated, service_role;

create or replace function public.ebd_editorial_guard_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_validation jsonb;
  v_privileged boolean := coalesce(current_setting('app.ebd_privileged_transition', true), '') = 'on';
  v_actor uuid;
begin
  v_validation := public.ebd_validar_documento(new.documento);
  if not coalesce((v_validation->>'valid')::boolean, false) then
    raise exception using
      errcode = '22023',
      message = 'EBD_DOCUMENT_INVALID',
      detail = left(v_validation::text, 1000);
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is not null and not v_privileged then
      v_actor := public.usuario_atual_id();
      if v_actor is null then
        raise exception using errcode = '42501', message = 'USER_PROFILE_REQUIRED';
      end if;
      new.criado_por := v_actor;
      new.status := 'draft';
      new.versao := 0;
      new.publicado_em := null;
    end if;
    return new;
  end if;

  if old.status = 'published'
     and (
       new.documento is distinct from old.documento
       or new.titulo is distinct from old.titulo
       or new.subtitulo is distinct from old.subtitulo
       or new.numero is distinct from old.numero
     )
     and not v_privileged then
    raise exception using errcode = '42501', message = 'PUBLISHED_LESSON_IS_IMMUTABLE';
  end if;

  if (
    new.status is distinct from old.status
    or new.versao is distinct from old.versao
    or new.publicado_em is distinct from old.publicado_em
  ) and not v_privileged then
    raise exception using errcode = '42501', message = 'EBD_PROTECTED_TRANSITION_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ebd_editorial_guard_write on public.ebd_editorial_lessons;
create trigger trg_ebd_editorial_guard_write
before insert or update on public.ebd_editorial_lessons
for each row execute function public.ebd_editorial_guard_write();

-- O cliente pode criar e editar somente campos editoriais seguros.
-- Status, versão, publicação, autoria e exclusão passam por RPCs protegidas.
revoke insert, update, delete on table public.ebd_editorial_lessons from authenticated;
grant insert (id, numero, titulo, subtitulo, documento)
  on table public.ebd_editorial_lessons to authenticated;
grant update (numero, titulo, subtitulo, documento)
  on table public.ebd_editorial_lessons to authenticated;

create or replace function public.ebd_enviar_para_revisao(
  p_licao_id text,
  p_idempotency_key text,
  p_reason text default 'Envio para revisão editorial'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_auth uuid := auth.uid();
  v_actor uuid := public.usuario_atual_id();
  v_lesson public.ebd_editorial_lessons%rowtype;
  v_rate jsonb;
  v_idem jsonb;
  v_hash text := md5(coalesce(p_licao_id, '') || '|review');
  v_result jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('ebd.manage') then
    raise exception using errcode = '42501', message = 'EBD_MANAGE_PERMISSION_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  v_rate := public.security_consume_rate_limit('ebd.review.submit', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.review.submit', p_idempotency_key, v_hash, 86400
  );
  if v_idem->>'state' = 'completed' then
    return v_idem->'response_data';
  elsif v_idem->>'state' <> 'acquired' then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_lesson
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    perform public.security_fail_idempotent_operation(
      v_actor_auth, 'ebd.review.submit', p_idempotency_key, 'LESSON_NOT_FOUND'
    );
    raise exception using errcode = 'P0002', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status <> 'draft' then
    perform public.security_fail_idempotent_operation(
      v_actor_auth, 'ebd.review.submit', p_idempotency_key, 'INVALID_STATE'
    );
    raise exception using errcode = 'P0001', message = 'EBD_INVALID_STATE_TRANSITION';
  end if;
  if not coalesce((public.ebd_validar_documento(v_lesson.documento)->>'valid')::boolean, false) then
    perform public.security_fail_idempotent_operation(
      v_actor_auth, 'ebd.review.submit', p_idempotency_key, 'INVALID_DOCUMENT'
    );
    raise exception using errcode = '22023', message = 'EBD_DOCUMENT_INVALID';
  end if;

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
     set status = 'review'
   where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor, 'ebd.manage', 'ebd.review.submit', 'ebd_editorial_lesson', p_licao_id,
    jsonb_build_object('status', v_lesson.status),
    jsonb_build_object('status', 'review'),
    trim(p_reason)
  );

  v_result := jsonb_build_object('lesson_id', p_licao_id, 'status', 'review');
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.review.submit', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.review.submit', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

create or replace function public.ebd_retornar_para_rascunho(
  p_licao_id text,
  p_idempotency_key text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_auth uuid := auth.uid();
  v_actor uuid := public.usuario_atual_id();
  v_lesson public.ebd_editorial_lessons%rowtype;
  v_rate jsonb;
  v_idem jsonb;
  v_hash text := md5(coalesce(p_licao_id, '') || '|draft|' || coalesce(p_reason, ''));
  v_result jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not (
    public.admin_tem_permissao('ebd.review')
    or public.admin_tem_permissao('ebd.publish')
  ) then
    raise exception using errcode = '42501', message = 'EBD_REVIEW_PERMISSION_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  v_rate := public.security_consume_rate_limit('ebd.review.return', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.review.return', p_idempotency_key, v_hash, 86400
  );
  if v_idem->>'state' = 'completed' then
    return v_idem->'response_data';
  elsif v_idem->>'state' <> 'acquired' then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_lesson
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status <> 'review' then
    raise exception using errcode = 'P0001', message = 'EBD_INVALID_STATE_TRANSITION';
  end if;

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
     set status = 'draft'
   where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor, 'ebd.review', 'ebd.review.return', 'ebd_editorial_lesson', p_licao_id,
    jsonb_build_object('status', v_lesson.status),
    jsonb_build_object('status', 'draft'),
    trim(p_reason)
  );

  v_result := jsonb_build_object('lesson_id', p_licao_id, 'status', 'draft');
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.review.return', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.review.return', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

create or replace function public.ebd_arquivar_editorial(
  p_licao_id text,
  p_idempotency_key text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_auth uuid := auth.uid();
  v_actor uuid := public.usuario_atual_id();
  v_lesson public.ebd_editorial_lessons%rowtype;
  v_rate jsonb;
  v_idem jsonb;
  v_hash text := md5(coalesce(p_licao_id, '') || '|archive|' || coalesce(p_reason, ''));
  v_result jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('ebd.manage') then
    raise exception using errcode = '42501', message = 'EBD_MANAGE_PERMISSION_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  v_rate := public.security_consume_rate_limit('ebd.archive', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.archive', p_idempotency_key, v_hash, 86400
  );
  if v_idem->>'state' = 'completed' then
    return v_idem->'response_data';
  elsif v_idem->>'state' <> 'acquired' then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_lesson
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'LESSON_NOT_FOUND';
  end if;

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
     set status = 'archived'
   where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor, 'ebd.manage', 'ebd.archive', 'ebd_editorial_lesson', p_licao_id,
    jsonb_build_object('status', v_lesson.status),
    jsonb_build_object('status', 'archived'),
    trim(p_reason)
  );

  v_result := jsonb_build_object('lesson_id', p_licao_id, 'status', 'archived');
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.archive', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.archive', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

create or replace function public.publicar_ebd_editorial_seguro(
  p_licao_id text,
  p_expected_version integer,
  p_idempotency_key text,
  p_reason text default 'Publicação editorial aprovada'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_auth uuid := auth.uid();
  v_actor uuid := public.usuario_atual_id();
  v_lesson public.ebd_editorial_lessons%rowtype;
  v_rate jsonb;
  v_circuit jsonb;
  v_idem jsonb;
  v_hash text := md5(
    coalesce(p_licao_id, '') || '|publish|' || coalesce(p_expected_version::text, '')
  );
  v_new_version integer;
  v_result jsonb;
  v_validation jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('ebd.publish') then
    raise exception using errcode = '42501', message = 'EBD_PUBLISH_PERMISSION_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  v_circuit := public.security_is_circuit_open('ebd.publish');
  if coalesce((v_circuit->>'open')::boolean, false) then
    raise exception using errcode = '55000', message = 'EBD_PUBLISH_TEMPORARILY_DISABLED';
  end if;

  v_rate := public.security_consume_rate_limit('ebd.publish', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.publish', p_idempotency_key, v_hash, 86400
  );
  if v_idem->>'state' = 'completed' then
    return v_idem->'response_data';
  elsif v_idem->>'state' <> 'acquired' then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_lesson
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status <> 'review' then
    raise exception using errcode = 'P0001', message = 'EBD_REVIEW_REQUIRED';
  end if;
  if p_expected_version is null or v_lesson.versao <> p_expected_version then
    raise exception using errcode = '40001', message = 'EBD_VERSION_CONFLICT';
  end if;

  v_validation := public.ebd_validar_documento(v_lesson.documento);
  if not coalesce((v_validation->>'valid')::boolean, false) then
    raise exception using errcode = '22023', message = 'EBD_DOCUMENT_INVALID',
      detail = left(v_validation::text, 1000);
  end if;

  v_new_version := v_lesson.versao + 1;

  insert into public.ebd_editorial_versions (
    licao_id, versao, documento, titulo, subtitulo, criado_por
  ) values (
    v_lesson.id, v_new_version, v_lesson.documento,
    v_lesson.titulo, v_lesson.subtitulo, v_actor
  );

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
     set status = 'published',
         versao = v_new_version,
         publicado_em = now()
   where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor,
    'ebd.publish',
    'ebd.publish',
    'ebd_editorial_lesson',
    p_licao_id,
    jsonb_build_object('status', v_lesson.status, 'version', v_lesson.versao),
    jsonb_build_object('status', 'published', 'version', v_new_version),
    trim(p_reason)
  );

  v_result := jsonb_build_object(
    'lesson_id', p_licao_id,
    'status', 'published',
    'version', v_new_version
  );
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.publish', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.publish', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

revoke all on function public.ebd_enviar_para_revisao(text, text, text) from public, anon;
revoke all on function public.ebd_retornar_para_rascunho(text, text, text) from public, anon;
revoke all on function public.ebd_arquivar_editorial(text, text, text) from public, anon;
revoke all on function public.publicar_ebd_editorial_seguro(text, integer, text, text) from public, anon;

grant execute on function public.ebd_enviar_para_revisao(text, text, text) to authenticated;
grant execute on function public.ebd_retornar_para_rascunho(text, text, text) to authenticated;
grant execute on function public.ebd_arquivar_editorial(text, text, text) to authenticated;
grant execute on function public.publicar_ebd_editorial_seguro(text, integer, text, text) to authenticated;

-- A função legada não oferece idempotência nem exige o estado de revisão.
-- Mantida no banco apenas para rollback, mas sem execução pelo cliente.
revoke all on function public.publicar_ebd_editorial(text) from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- 6. Rate limit em papéis administrativos já existentes
-- ---------------------------------------------------------------------------

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
  v_actor_auth uuid := auth.uid();
  v_assignment_id uuid;
  v_rate jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('people.roles') then
    raise exception using errcode = '42501', message = 'ADMIN_PERMISSION_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  if p_usuario_id = v_actor then
    raise exception using errcode = '42501', message = 'SELF_ROLE_ASSIGNMENT_DENIED';
  end if;

  v_rate := public.security_consume_rate_limit('admin.role.assign', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  insert into public.admin_role_assignments (
    usuario_id, role_code, active, assigned_by, reason, updated_at
  ) values (
    p_usuario_id, p_role_code, true, v_actor, trim(p_reason), now()
  )
  on conflict (usuario_id, role_code)
  do update set
    active = true,
    assigned_by = excluded.assigned_by,
    reason = excluded.reason,
    updated_at = now()
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
  v_actor_auth uuid := auth.uid();
  v_rate jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('people.roles') then
    raise exception using errcode = '42501', message = 'ADMIN_PERMISSION_REQUIRED';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  if p_usuario_id = v_actor and p_role_code = 'administrador' then
    raise exception using errcode = '42501', message = 'SELF_ADMIN_REMOVAL_DENIED';
  end if;

  v_rate := public.security_consume_rate_limit('admin.role.remove', 'auth:' || v_actor_auth::text);
  if not coalesce((v_rate->>'allowed')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      detail = coalesce(v_rate->>'retry_after_seconds', '60');
  end if;

  update public.admin_role_assignments
     set active = false,
         assigned_by = v_actor,
         reason = trim(p_reason),
         updated_at = now()
   where usuario_id = p_usuario_id
     and role_code = p_role_code;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, before_data, reason
  ) values (
    v_actor, 'people.roles', 'role.remove', 'usuario', p_usuario_id::text,
    jsonb_build_object('role_code', p_role_code, 'active', true), trim(p_reason)
  );
end;
$$;

revoke all on function public.admin_atribuir_papel(uuid, text, text) from public, anon;
revoke all on function public.admin_remover_papel(uuid, text, text) from public, anon;
grant execute on function public.admin_atribuir_papel(uuid, text, text) to authenticated;
grant execute on function public.admin_remover_papel(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Manutenção controlada
-- ---------------------------------------------------------------------------

create or replace function public.security_cleanup_operational_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate_deleted bigint := 0;
  v_idem_deleted bigint := 0;
begin
  delete from public.security_rate_limit_counters
  where updated_at < now() - interval '8 days'
    and (blocked_until is null or blocked_until < now() - interval '1 day');
  get diagnostics v_rate_deleted = row_count;

  delete from public.security_idempotency_keys
  where expires_at < now() - interval '1 day';
  get diagnostics v_idem_deleted = row_count;

  return jsonb_build_object(
    'rate_limit_counters_deleted', v_rate_deleted,
    'idempotency_keys_deleted', v_idem_deleted
  );
end;
$$;

revoke all on function public.security_cleanup_operational_state() from public, anon, authenticated;
grant execute on function public.security_cleanup_operational_state() to service_role;

commit;
