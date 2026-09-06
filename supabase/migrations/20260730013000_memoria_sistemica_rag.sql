-- Comunhão — Memória Sistêmica RAG
-- Biblioteca privada, chunking, embeddings locais (gte-small) e busca híbrida.

create extension if not exists vector with schema extensions;

create table if not exists public.plataforma_fontes_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 2 and 240),
  descricao text not null default '',
  escopo text not null default 'global'
    check (escopo in ('global', 'ebd', 'oracao', 'mural', 'formacao', 'administrativo')),
  categoria text not null default 'documento'
    check (categoria in ('licao', 'biblia', 'doutrina', 'manual', 'documento', 'politica', 'roteiro', 'outro')),
  tags text[] not null default '{}',
  nome_arquivo text not null,
  tipo_mime text not null,
  storage_path text not null unique,
  tamanho_bytes bigint not null default 0 check (tamanho_bytes >= 0),
  checksum_sha256 text not null,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'error', 'archived')),
  ativo boolean not null default true,
  total_chunks integer not null default 0 check (total_chunks >= 0),
  total_caracteres integer not null default 0 check (total_caracteres >= 0),
  paginas integer,
  metadata jsonb not null default '{}'::jsonb,
  erro text,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  processado_em timestamptz
);

create unique index if not exists idx_plataforma_fontes_checksum_ativo
  on public.plataforma_fontes_conhecimento(checksum_sha256)
  where ativo = true;

create index if not exists idx_plataforma_fontes_status
  on public.plataforma_fontes_conhecimento(status, ativo, criado_em desc);

create index if not exists idx_plataforma_fontes_escopo
  on public.plataforma_fontes_conhecimento(escopo, categoria, ativo);

create table if not exists public.plataforma_memoria_chunks (
  id bigint primary key generated always as identity,
  fonte_id uuid not null references public.plataforma_fontes_conhecimento(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  conteudo text not null check (char_length(conteudo) > 0),
  token_estimado integer not null default 0 check (token_estimado >= 0),
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(384),
  conteudo_tsv tsvector generated always as (
    to_tsvector('portuguese', coalesce(conteudo, ''))
  ) stored,
  criado_em timestamptz not null default now(),
  unique (fonte_id, chunk_index)
);

create index if not exists idx_plataforma_memoria_fonte
  on public.plataforma_memoria_chunks(fonte_id, chunk_index);

create index if not exists idx_plataforma_memoria_tsv
  on public.plataforma_memoria_chunks using gin(conteudo_tsv);

-- O índice HNSW é uma otimização, não um requisito funcional do RAG.
-- Alguns projetos antigos podem ter pgvector sem HNSW ou com a operator class
-- fora do search_path da role de migrations. A migration deve continuar e usar
-- busca exata até que o índice possa ser criado.
do $$
declare
  v_has_hnsw boolean;
  v_has_ip_ops boolean;
begin
  select exists (
    select 1
    from pg_am
    where amname = 'hnsw'
  ) into v_has_hnsw;

  select exists (
    select 1
    from pg_opclass opc
    join pg_namespace ns on ns.oid = opc.opcnamespace
    join pg_am am on am.oid = opc.opcmethod
    where ns.nspname = 'extensions'
      and opc.opcname = 'vector_ip_ops'
      and am.amname = 'hnsw'
  ) into v_has_ip_ops;

  if v_has_hnsw and v_has_ip_ops then
    execute $index$
      create index if not exists idx_plataforma_memoria_embedding
      on public.plataforma_memoria_chunks
      using hnsw (embedding extensions.vector_ip_ops)
      with (m = 16, ef_construction = 64)
    $index$;
  else
    raise notice 'HNSW/vector_ip_ops indisponível; RAG seguirá com busca vetorial exata sem índice aproximado.';
  end if;
end;
$$;

create or replace function public.plataforma_memoria_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_plataforma_fontes_touch on public.plataforma_fontes_conhecimento;
create trigger trg_plataforma_fontes_touch
before update on public.plataforma_fontes_conhecimento
for each row execute function public.plataforma_memoria_touch_updated_at();

alter table public.plataforma_fontes_conhecimento enable row level security;
alter table public.plataforma_memoria_chunks enable row level security;

-- A biblioteca é administrativa. Os consumidores sistêmicos usam service_role
-- dentro das Edge Functions, sem expor os chunks diretamente ao aplicativo.
drop policy if exists "fontes_conhecimento_admin_all" on public.plataforma_fontes_conhecimento;
create policy "fontes_conhecimento_admin_all"
on public.plataforma_fontes_conhecimento
for all
to authenticated
using (
  exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
)
with check (
  exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

drop policy if exists "memoria_chunks_admin_select" on public.plataforma_memoria_chunks;
create policy "memoria_chunks_admin_select"
on public.plataforma_memoria_chunks
for select
to authenticated
using (
  exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

-- Busca híbrida: 80% semântica + 20% lexical.
-- Vetores gte-small são normalizados, então inner product equivale à similaridade cosseno.
create or replace function public.buscar_memoria_rag(
  p_embedding extensions.vector(384),
  p_consulta text,
  p_escopos text[] default null,
  p_categorias text[] default null,
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

revoke all on function public.buscar_memoria_rag(extensions.vector, text, text[], text[], integer, real) from public;
grant execute on function public.buscar_memoria_rag(extensions.vector, text, text[], text[], integer, real) to authenticated, service_role;

-- Bucket privado para originais. Os trechos ficam no Postgres, mas o arquivo-fonte
-- continua preservado para auditoria e reprocessamento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plataforma-conhecimento',
  'plataforma-conhecimento',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "conhecimento_admin_select" on storage.objects;
create policy "conhecimento_admin_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

drop policy if exists "conhecimento_admin_insert" on storage.objects;
create policy "conhecimento_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

drop policy if exists "conhecimento_admin_update" on storage.objects;
create policy "conhecimento_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
)
with check (
  bucket_id = 'plataforma-conhecimento'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

drop policy if exists "conhecimento_admin_delete" on storage.objects;
create policy "conhecimento_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'plataforma-conhecimento'
  and exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);
