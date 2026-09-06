create or replace function public.ebd_antecipar_semana_publicada(
  p_licao_id text,
  p_expected_version integer,
  p_idempotency_key text,
  p_reason text default 'Antecipação editorial da semana publicada'
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
  v_document jsonb;
  v_new_version integer;
  v_idem jsonb;
  v_hash text := md5(coalesce(p_licao_id, '') || '|early-week|' || coalesce(p_expected_version::text, ''));
  v_result jsonb;
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

  v_idem := public.security_begin_idempotent_operation(
    v_actor_auth, 'ebd.publish.week-now', p_idempotency_key, v_hash, 86400
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
    raise exception using errcode = 'P0001', message = 'EBD_LESSON_NOT_PUBLISHED';
  end if;
  if p_expected_version is null or v_lesson.versao <> p_expected_version then
    raise exception using errcode = '40001', message = 'EBD_VERSION_CONFLICT';
  end if;
  if coalesce(v_lesson.documento->>'releaseMode', 'scheduled') = 'immediate' then
    raise exception using errcode = 'P0001', message = 'EBD_WEEK_ALREADY_IMMEDIATE';
  end if;

  v_document := jsonb_set(v_lesson.documento, '{releaseMode}', '"immediate"'::jsonb, true);
  v_new_version := v_lesson.versao + 1;

  insert into public.ebd_editorial_versions (
    licao_id, versao, documento, titulo, subtitulo, criado_por
  ) values (
    v_lesson.id, v_new_version, v_document,
    v_lesson.titulo, v_lesson.subtitulo, v_actor
  );

  perform set_config('app.ebd_privileged_transition', 'on', true);
  update public.ebd_editorial_lessons
  set documento = v_document,
      versao = v_new_version
  where id = p_licao_id;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_actor, 'ebd.publish', 'ebd.publish.week-now', 'ebd_editorial_lesson', p_licao_id,
    jsonb_build_object('version', v_lesson.versao, 'release_mode', v_lesson.documento->>'releaseMode'),
    jsonb_build_object('version', v_new_version, 'release_mode', 'immediate'),
    trim(p_reason)
  );

  v_result := jsonb_build_object(
    'lesson_id', p_licao_id, 'status', 'published',
    'release_mode', 'immediate', 'version', v_new_version
  );
  perform public.security_complete_idempotent_operation(
    v_actor_auth, 'ebd.publish.week-now', p_idempotency_key, v_result
  );
  return v_result;
exception
  when others then
    if v_actor_auth is not null and p_idempotency_key is not null then
      perform public.security_fail_idempotent_operation(
        v_actor_auth, 'ebd.publish.week-now', p_idempotency_key, sqlstate
      );
    end if;
    raise;
end;
$$;

revoke all on function public.ebd_antecipar_semana_publicada(text, integer, text, text) from public, anon;
grant execute on function public.ebd_antecipar_semana_publicada(text, integer, text, text) to authenticated;
