-- Teste estrutural da Fase 1. Executar após a migration em ambiente local/staging.
-- Não substitui testes autenticados de RLS por papel.

do $$
begin
  if to_regclass('public.security_rate_limit_policies') is null then
    raise exception 'security_rate_limit_policies ausente';
  end if;
  if to_regclass('public.security_idempotency_keys') is null then
    raise exception 'security_idempotency_keys ausente';
  end if;
  if to_regclass('public.security_events') is null then
    raise exception 'security_events ausente';
  end if;
  if to_regprocedure('public.publicar_ebd_editorial_seguro(text,integer,text,text)') is null then
    raise exception 'publicar_ebd_editorial_seguro ausente';
  end if;
  if to_regprocedure('public.security_consume_rate_limit(text,text)') is null then
    raise exception 'security_consume_rate_limit ausente';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.publicar_ebd_editorial(text)',
    'EXECUTE'
  ) then
    raise exception 'função legada de publicação ainda executável por authenticated';
  end if;

  if has_table_privilege('authenticated', 'public.ebd_editorial_lessons', 'DELETE') then
    raise exception 'authenticated ainda possui DELETE direto na tabela editorial';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.ebd_editorial_lessons',
    'status',
    'UPDATE'
  ) then
    raise exception 'authenticated ainda pode atualizar status diretamente';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.ebd_editorial_lessons',
    'versao',
    'UPDATE'
  ) then
    raise exception 'authenticated ainda pode atualizar versão diretamente';
  end if;

  if not has_column_privilege(
    'authenticated',
    'public.ebd_editorial_lessons',
    'documento',
    'UPDATE'
  ) then
    raise exception 'editor perdeu a capacidade de salvar documento';
  end if;
end;
$$;

select 'sentinel_phase1_structural_checks_ok' as result;
