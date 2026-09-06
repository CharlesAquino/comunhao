-- Permite continuar produzindo os dias ainda bloqueados depois que um primeiro
-- dia da lição foi publicado. Dias já liberados permanecem imutáveis.
create or replace function public.ebd_salvar_dia_editorial_nao_liberado(
  p_licao_id text,
  p_day_id text,
  p_day jsonb,
  p_expected_version integer,
  p_idempotency_key text,
  p_reason text default 'Salvamento editorial de dia ainda não liberado'
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
  v_day_index integer;
  v_existing_day jsonb;
  v_existing_unlock text;
  v_document jsonb;
  v_idem jsonb;
  v_hash text := md5(
    coalesce(p_licao_id, '') || '|save-unreleased-day|' ||
    coalesce(p_day_id, '') || '|' || coalesce(p_expected_version::text, '') || '|' ||
    coalesce(p_day::text, '')
  );
  v_result jsonb;
begin
  if v_actor_auth is null or v_actor is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.admin_tem_permissao('ebd.manage') then
    raise exception using errcode = '42501', message = 'EBD_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_day is null or jsonb_typeof(p_day) <> 'object' or p_day->>'id' <> p_day_id then
    raise exception using errcode = '22023', message = 'EBD_DAY_INVALID';
  end if;
  if jsonb_typeof(p_day->'blocks') <> 'array' then
    raise exception using errcode = '22023', message = 'EBD_DAY_INVALID';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  v_day_index := case p_day->>'day'
    when 'monday' then 0
    when 'tuesday' then 1
    when 'wednesday' then 2
    when 'thursday' then 3
    when 'friday' then 4
    when 'saturday' then 5
    when 'sunday' then 6
    else null
  end;
  if v_day_index is null then
    raise exception using errcode = '22023', message = 'EBD_DAY_INVALID';
  end if;

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.save.unreleased-day', p_idempotency_key, v_hash, 86400
  );
  if v_idem->>'state' = 'completed' then return v_idem->'response_data'; end if;
  if v_idem->>'state' <> 'acquired' then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_lesson
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then raise exception using errcode = 'P0002', message = 'LESSON_NOT_FOUND'; end if;
  if v_lesson.status <> 'published' then
    raise exception using errcode = 'P0001', message = 'EBD_PUBLISHED_LESSON_REQUIRED';
  end if;
  if p_expected_version is null or v_lesson.versao <> p_expected_version then
    raise exception using errcode = '40001', message = 'EBD_VERSION_CONFLICT';
  end if;
  if jsonb_typeof(v_lesson.documento->'days') <> 'array'
     or jsonb_array_length(v_lesson.documento->'days') <> 7 then
    raise exception using errcode = '22023', message = 'EBD_DOCUMENT_INVALID';
  end if;

  v_existing_day := v_lesson.documento->'days'->v_day_index;
  v_existing_unlock := trim(coalesce(v_existing_day->>'unlocksAt', ''));
  if v_existing_unlock <> '' and v_existing_unlock::timestamptz <= now() then
    raise exception using errcode = 'P0001', message = 'EBD_RELEASED_DAY_IMMUTABLE';
  end if;

  v_document := jsonb_set(v_lesson.documento, array['days', v_day_index::text], p_day, false);
  if not coalesce((public.ebd_validar_documento(v_document)->>'valid')::boolean, false) then
    raise exception using errcode = '22023', message = 'EBD_DOCUMENT_INVALID';
  end if;

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
  set documento = v_document
  where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor, 'ebd.manage', 'ebd.save.unreleased-day', 'ebd_editorial_lesson', p_licao_id,
    jsonb_build_object('status', v_lesson.status, 'version', v_lesson.versao, 'day_id', p_day_id, 'day_index', v_day_index),
    jsonb_build_object('status', v_lesson.status, 'version', v_lesson.versao, 'day_id', p_day_id, 'day_index', v_day_index),
    trim(p_reason)
  );

  v_result := jsonb_build_object(
    'lesson_id', p_licao_id, 'day_id', p_day_id, 'day_index', v_day_index,
    'status', v_lesson.status, 'version', v_lesson.versao
  );
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.save.unreleased-day', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.save.unreleased-day', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

revoke all on function public.ebd_salvar_dia_editorial_nao_liberado(text, text, jsonb, integer, text, text)
  from public, anon;
grant execute on function public.ebd_salvar_dia_editorial_nao_liberado(text, text, jsonb, integer, text, text)
  to authenticated;
