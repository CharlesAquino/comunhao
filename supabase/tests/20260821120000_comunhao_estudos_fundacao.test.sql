-- Contrato de revisão estática da fundação Comunhão Estudos.
-- Executar em ambiente autorizado após a migration; não contém dados reais.

do $$
begin
  if to_regclass('public.estudos_temporadas') is null
    or to_regclass('public.estudos_estudos') is null
    or to_regclass('public.estudos_blocos') is null
    or to_regclass('public.estudos_revisores') is null
    or to_regclass('public.estudos_manifestacoes_pastorais') is null
    or to_regclass('public.estudos_progresso') is null then
    raise exception 'tabelas da fundação Comunhão Estudos ausentes';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'estudos_estudos' and column_name = 'versao') then
    raise exception 'estudos_estudos.versao ausente';
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'estudos_progresso' and c.relrowsecurity) then
    raise exception 'RLS de estudos_progresso ausente';
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'estudos_manifestacoes_pastorais' and c.relrowsecurity) then
    raise exception 'RLS de manifestações pastorais ausente';
  end if;
end;
$$;

select 'comunhao_estudos_fundacao_structural_checks_ok' as result;
