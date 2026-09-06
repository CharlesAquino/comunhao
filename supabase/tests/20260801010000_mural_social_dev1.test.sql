-- Teste estrutural do Mural Social 1.4.0-dev.1.
-- Executar somente após a migration em ambiente local ou staging.

do $$
begin
  if to_regclass('public.mural_midias') is null then
    raise exception 'mural_midias ausente';
  end if;

  if to_regclass('public.mural_comentarios') is null then
    raise exception 'mural_comentarios ausente';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pedidos'
      and column_name = 'permite_comentarios'
  ) then
    raise exception 'pedidos.permite_comentarios ausente';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'mural-media'
      and public = false
      and file_size_limit = 1200000
  ) then
    raise exception 'bucket mural-media privado ou limite incorreto';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mural_midias'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%publicacao_id%'
  ) then
    raise exception 'limite de uma mídia por publicação ausente';
  end if;

  if to_regprocedure('public.notificar_comentario_publicacao_mural()') is null then
    raise exception 'produtor de atividade de comentário ausente';
  end if;
end;
$$;

select 'mural_social_dev1_structural_checks_ok' as result;
