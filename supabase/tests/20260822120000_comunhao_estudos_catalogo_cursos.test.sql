do $$
begin
  if to_regclass('public.estudos_trilhas') is null
    or to_regclass('public.estudos_cursos') is null
    or to_regclass('public.estudos_modulos') is null
    or to_regclass('public.estudos_aulas') is null
    or to_regclass('public.estudos_aula_blocos') is null
    or to_regclass('public.estudos_aula_progresso') is null
    or to_regclass('public.estudos_matriculas') is null
    or to_regclass('public.estudos_certificados') is null
    or to_regclass('public.estudos_curso_fontes') is null
    or to_regclass('public.estudos_ai_execucoes') is null
    or to_regclass('public.estudos_curso_revisores') is null
    or to_regclass('public.estudos_curso_manifestacoes_pastorais') is null then
    raise exception 'estrutura escalável do Comunhão Estudos incompleta';
  end if;

  if to_regprocedure('public.estudos_concluir_bloco(uuid)') is null then
    raise exception 'RPC de progresso e certificação ausente';
  end if;
  if to_regprocedure('public.estudos_publicar_curso(uuid)') is null then
    raise exception 'RPC protegida de publicação ausente';
  end if;
  if to_regprocedure('public.estudos_definir_fontes_curso(uuid,uuid[])') is null then
    raise exception 'RPC de vínculo das fontes RAG ausente';
  end if;
  if to_regprocedure('public.estudos_substituir_blocos_aula(uuid,jsonb)') is null then
    raise exception 'RPC transacional de blocos ausente';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'estudos_certificados' and c.relrowsecurity
  ) then raise exception 'RLS de certificados ausente'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'estudos_certificados' and column_name = 'codigo_validacao'
  ) then raise exception 'código de validação do certificado ausente'; end if;

  if not exists (select 1 from public.security_rate_limit_policies where action = 'estudos.ai.generate') then
    raise exception 'rate limit da geração de Estudos ausente';
  end if;
  if not exists (select 1 from public.security_circuit_breakers where action = 'estudos.ai.generate') then
    raise exception 'circuit breaker da geração de Estudos ausente';
  end if;
end $$;

select 'comunhao_estudos_catalogo_cursos_structural_checks_ok' as result;
