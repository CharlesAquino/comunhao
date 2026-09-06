-- Restringe a recuperação RAG às fontes explicitamente vinculadas à lição.
-- A função original permanece disponível para buscas administrativas gerais.

create or replace function public.buscar_memoria_rag_filtrada(
  p_embedding extensions.vector(384),
  p_consulta text,
  p_escopos text[] default null,
  p_categorias text[] default null,
  p_fonte_ids uuid[] default null,
  p_limite integer default 8,
  p_threshold real default 0.42
)
returns table (
  chunk_id bigint,
  fonte_id uuid,
  fonte_titulo text,
  escopo text,
  categoria text,
  chunk_index integer,
  conteudo text,
  metadata jsonb,
  similaridade_semantica real,
  relevancia_lexical real,
  score_final real
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_query tsquery;
  v_limit integer := greatest(1, least(coalesce(p_limite, 8), 20));
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_query := case
    when nullif(trim(coalesce(p_consulta, '')), '') is null then null
    else plainto_tsquery('portuguese', p_consulta)
  end;

  return query
  with ranked as (
    select
      c.id as chunk_id,
      c.fonte_id,
      f.titulo as fonte_titulo,
      f.escopo,
      f.categoria,
      c.chunk_index,
      c.conteudo,
      c.metadata,
      greatest(0::real, (-(c.embedding <#> p_embedding))::real) as semantic_score,
      case
        when v_query is null then 0::real
        else least(1::real, ts_rank_cd(c.conteudo_tsv, v_query)::real)
      end as lexical_score
    from public.plataforma_memoria_chunks c
    join public.plataforma_fontes_conhecimento f on f.id = c.fonte_id
    where c.embedding is not null
      and f.ativo = true
      and f.status = 'ready'
      and p_fonte_ids is not null
      and cardinality(p_fonte_ids) > 0
      and c.fonte_id = any(p_fonte_ids)
      and (p_escopos is null or cardinality(p_escopos) = 0 or f.escopo = any(p_escopos))
      and (p_categorias is null or cardinality(p_categorias) = 0 or f.categoria = any(p_categorias))
  ), scored as (
    select *, ((semantic_score * 0.80) + (lexical_score * 0.20))::real as final_score
    from ranked
  )
  select
    r.chunk_id,
    r.fonte_id,
    r.fonte_titulo,
    r.escopo,
    r.categoria,
    r.chunk_index,
    r.conteudo,
    r.metadata,
    r.semantic_score,
    r.lexical_score,
    r.final_score
  from scored r
  where r.semantic_score >= coalesce(p_threshold, 0.42)
  order by r.final_score desc, r.semantic_score desc
  limit v_limit;
end;
$$;

revoke all on function public.buscar_memoria_rag_filtrada(
  extensions.vector, text, text[], text[], uuid[], integer, real
) from public;

grant execute on function public.buscar_memoria_rag_filtrada(
  extensions.vector, text, text[], text[], uuid[], integer, real
) to authenticated, service_role;
