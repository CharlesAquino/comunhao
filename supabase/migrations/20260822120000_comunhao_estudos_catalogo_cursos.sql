-- Comunhão Estudos — catálogo escalável, progressão ordenada e certificado pastoral
-- Migration aditiva: preserva as tabelas da fundação de 21/08 como legado compatível.

alter table public.plataforma_fontes_conhecimento
  drop constraint if exists plataforma_fontes_conhecimento_escopo_check;
alter table public.plataforma_fontes_conhecimento
  add constraint plataforma_fontes_conhecimento_escopo_check
  check (escopo in ('global', 'ebd', 'estudos', 'oracao', 'mural', 'formacao', 'administrativo'));

create table if not exists public.estudos_trilhas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao text not null default '',
  ordem integer not null default 0 check (ordem >= 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'arquivada')),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.estudos_cursos (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references public.estudos_trilhas(id) on delete restrict,
  slug text not null unique,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
  subtitulo text not null default '',
  descricao text not null default '',
  ministrante text not null default '',
  nivel text not null default 'fundamentos' check (nivel in ('fundamentos', 'intermediario', 'aprofundamento')),
  duracao_minutos integer not null default 0 check (duracao_minutos >= 0),
  capa_clara_url text,
  capa_escura_url text,
  banner_claro_url text,
  banner_escuro_url text,
  hero_url text,
  tags text[] not null default '{}',
  certificado_habilitado boolean not null default true,
  status text not null default 'rascunho' check (status in ('rascunho', 'revisao_pastoral', 'publicado', 'arquivado', 'em_breve')),
  versao integer not null default 1 check (versao > 0),
  publicado_em timestamptz,
  publicado_por uuid references public.usuarios(id) on delete set null,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.estudos_modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  slug text not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
  descricao text not null default '',
  ordem integer not null check (ordem > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (curso_id, slug),
  unique (curso_id, ordem)
);

create table if not exists public.estudos_aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.estudos_modulos(id) on delete cascade,
  slug text not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 180),
  referencia_biblica text not null default '',
  descricao text not null default '',
  duracao_minutos integer not null default 0 check (duracao_minutos >= 0),
  ordem integer not null check (ordem > 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'arquivada')),
  versao integer not null default 1 check (versao > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (modulo_id, slug),
  unique (modulo_id, ordem)
);

create table if not exists public.estudos_aula_blocos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.estudos_aulas(id) on delete cascade,
  tipo text not null check (tipo in ('video', 'scripture', 'context', 'reflection', 'mission', 'meeting', 'audio', 'resource')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 180),
  resumo text not null default '',
  conteudo jsonb not null default '{}'::jsonb,
  ordem integer not null check (ordem > 0),
  obrigatorio boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (aula_id, ordem)
);

create table if not exists public.estudos_matriculas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  curso_versao integer not null check (curso_versao > 0),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  unique (curso_id, usuario_id, curso_versao)
);

create table if not exists public.estudos_aula_progresso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  aula_id uuid not null references public.estudos_aulas(id) on delete cascade,
  bloco_id uuid not null references public.estudos_aula_blocos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  curso_versao integer not null check (curso_versao > 0),
  aula_versao integer not null check (aula_versao > 0),
  concluido_em timestamptz not null default now(),
  unique (bloco_id, usuario_id, curso_versao, aula_versao)
);

create table if not exists public.estudos_certificados (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  curso_versao integer not null check (curso_versao > 0),
  codigo_validacao text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  validade_pastoral boolean not null default true,
  emitido_em timestamptz not null default now(),
  revogado_em timestamptz,
  revogado_por uuid references public.usuarios(id) on delete set null,
  motivo_revogacao text,
  unique (curso_id, usuario_id, curso_versao)
);

create table if not exists public.estudos_curso_revisores (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  revisor_id uuid not null references public.usuarios(id) on delete cascade,
  atribuido_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (curso_id, revisor_id)
);

create table if not exists public.estudos_curso_manifestacoes_pastorais (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  revisor_id uuid not null references public.usuarios(id) on delete cascade,
  curso_versao integer not null check (curso_versao > 0),
  manifestacao text not null check (manifestacao in ('gostei', 'ficou_bom')),
  criado_em timestamptz not null default now(),
  unique (curso_id, revisor_id, curso_versao)
);

create table if not exists public.estudos_curso_fontes (
  curso_id uuid not null references public.estudos_cursos(id) on delete cascade,
  fonte_id uuid not null references public.plataforma_fontes_conhecimento(id) on delete restrict,
  vinculado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key (curso_id, fonte_id)
);

create table if not exists public.estudos_ai_execucoes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid references public.estudos_cursos(id) on delete set null,
  aula_id uuid references public.estudos_aulas(id) on delete set null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  modelo text not null,
  versao_prompt text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  entrada jsonb not null default '{}'::jsonb,
  saida jsonb,
  fontes_rag jsonb not null default '[]'::jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  duracao_ms integer not null default 0 check (duracao_ms >= 0),
  erro text,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create index if not exists estudos_cursos_trilha_idx on public.estudos_cursos (trilha_id, status);
create index if not exists estudos_modulos_curso_idx on public.estudos_modulos (curso_id, ordem);
create index if not exists estudos_aulas_modulo_idx on public.estudos_aulas (modulo_id, ordem);
create index if not exists estudos_aula_blocos_aula_idx on public.estudos_aula_blocos (aula_id, ordem);
create index if not exists estudos_aula_progresso_usuario_idx on public.estudos_aula_progresso (usuario_id, curso_id);
create index if not exists estudos_certificados_usuario_idx on public.estudos_certificados (usuario_id, emitido_em desc);
create index if not exists estudos_curso_fontes_curso_idx on public.estudos_curso_fontes (curso_id);
create index if not exists estudos_ai_execucoes_aula_idx on public.estudos_ai_execucoes (aula_id, criado_em desc);

insert into public.security_rate_limit_policies (action, max_requests, window_seconds, block_seconds, description)
values ('estudos.ai.generate', 12, 3600, 900, 'Geração de aulas do Comunhão Estudos por ator e origem.')
on conflict (action) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds,
  block_seconds = excluded.block_seconds,
  description = excluded.description,
  updated_at = now();

insert into public.security_circuit_breakers(action)
values ('estudos.ai.generate')
on conflict (action) do nothing;

alter table public.estudos_trilhas enable row level security;
alter table public.estudos_cursos enable row level security;
alter table public.estudos_modulos enable row level security;
alter table public.estudos_aulas enable row level security;
alter table public.estudos_aula_blocos enable row level security;
alter table public.estudos_matriculas enable row level security;
alter table public.estudos_aula_progresso enable row level security;
alter table public.estudos_certificados enable row level security;
alter table public.estudos_curso_revisores enable row level security;
alter table public.estudos_curso_manifestacoes_pastorais enable row level security;
alter table public.estudos_curso_fontes enable row level security;
alter table public.estudos_ai_execucoes enable row level security;

create or replace function public.estudos_pode_ler_curso(p_curso_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.estudos_cursos c
    where c.id = p_curso_id and (
      c.status = 'publicado'
      or public.admin_tem_permissao('estudos.manage')
      or (public.admin_tem_permissao('estudos.review') and exists (
        select 1 from public.estudos_curso_revisores r
        where r.curso_id = c.id and r.revisor_id = public.usuario_atual_id()
      ))
    )
  );
$$;

revoke all on function public.estudos_pode_ler_curso(uuid) from public;
grant execute on function public.estudos_pode_ler_curso(uuid) to authenticated;

drop policy if exists estudos_trilhas_select_v2 on public.estudos_trilhas;
create policy estudos_trilhas_select_v2 on public.estudos_trilhas for select to authenticated using (
  status = 'publicada' or public.admin_tem_permissao('estudos.manage') or public.admin_tem_permissao('estudos.review')
);

drop policy if exists estudos_cursos_select_v2 on public.estudos_cursos;
create policy estudos_cursos_select_v2 on public.estudos_cursos for select to authenticated using (public.estudos_pode_ler_curso(id));

drop policy if exists estudos_modulos_select_v2 on public.estudos_modulos;
create policy estudos_modulos_select_v2 on public.estudos_modulos for select to authenticated using (public.estudos_pode_ler_curso(curso_id));

drop policy if exists estudos_aulas_select_v2 on public.estudos_aulas;
create policy estudos_aulas_select_v2 on public.estudos_aulas for select to authenticated using (exists (
  select 1 from public.estudos_modulos m where m.id = modulo_id and public.estudos_pode_ler_curso(m.curso_id)
));

drop policy if exists estudos_aula_blocos_select_v2 on public.estudos_aula_blocos;
create policy estudos_aula_blocos_select_v2 on public.estudos_aula_blocos for select to authenticated using (exists (
  select 1 from public.estudos_aulas a join public.estudos_modulos m on m.id = a.modulo_id
  where a.id = aula_id and public.estudos_pode_ler_curso(m.curso_id)
));

do $$
declare v_table text;
begin
  foreach v_table in array array['estudos_trilhas','estudos_modulos','estudos_aulas','estudos_aula_blocos','estudos_curso_revisores','estudos_curso_fontes'] loop
    execute format('drop policy if exists %I on public.%I', v_table || '_manage_all', v_table);
    execute format('create policy %I on public.%I for all to authenticated using (public.admin_tem_permissao(''estudos.manage'')) with check (public.admin_tem_permissao(''estudos.manage''))', v_table || '_manage_all', v_table);
  end loop;
end $$;

drop policy if exists estudos_ai_execucoes_select_manage on public.estudos_ai_execucoes;
create policy estudos_ai_execucoes_select_manage on public.estudos_ai_execucoes for select to authenticated using (
  public.admin_tem_permissao('estudos.manage')
);
revoke insert, update, delete on public.estudos_ai_execucoes from authenticated, anon;
grant select on public.estudos_ai_execucoes to authenticated;

drop policy if exists estudos_cursos_insert_manage on public.estudos_cursos;
create policy estudos_cursos_insert_manage on public.estudos_cursos for insert to authenticated with check (
  public.admin_tem_permissao('estudos.manage') and status <> 'publicado'
);

drop policy if exists estudos_cursos_update_manage on public.estudos_cursos;
create policy estudos_cursos_update_manage on public.estudos_cursos for update to authenticated using (
  public.admin_tem_permissao('estudos.manage')
) with check (
  public.admin_tem_permissao('estudos.manage') and status <> 'publicado'
);

drop policy if exists estudos_cursos_delete_manage on public.estudos_cursos;
create policy estudos_cursos_delete_manage on public.estudos_cursos for delete to authenticated using (
  public.admin_tem_permissao('estudos.manage') and status <> 'publicado'
);

drop policy if exists estudos_matriculas_select_own on public.estudos_matriculas;
create policy estudos_matriculas_select_own on public.estudos_matriculas for select to authenticated using (
  usuario_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage')
);

drop policy if exists estudos_aula_progresso_select_own on public.estudos_aula_progresso;
create policy estudos_aula_progresso_select_own on public.estudos_aula_progresso for select to authenticated using (
  usuario_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage')
);

drop policy if exists estudos_certificados_select_own on public.estudos_certificados;
create policy estudos_certificados_select_own on public.estudos_certificados for select to authenticated using (
  usuario_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage')
);

drop policy if exists estudos_curso_revisores_select_v2 on public.estudos_curso_revisores;
create policy estudos_curso_revisores_select_v2 on public.estudos_curso_revisores for select to authenticated using (
  revisor_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage')
);

drop policy if exists estudos_curso_manifestacoes_select_v2 on public.estudos_curso_manifestacoes_pastorais;
create policy estudos_curso_manifestacoes_select_v2 on public.estudos_curso_manifestacoes_pastorais for select to authenticated using (
  revisor_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage')
);

drop policy if exists estudos_curso_manifestacoes_insert_v2 on public.estudos_curso_manifestacoes_pastorais;
create policy estudos_curso_manifestacoes_insert_v2 on public.estudos_curso_manifestacoes_pastorais for insert to authenticated with check (
  revisor_id = public.usuario_atual_id()
  and public.admin_tem_permissao('estudos.review')
  and exists (select 1 from public.estudos_curso_revisores r where r.curso_id = curso_id and r.revisor_id = public.usuario_atual_id())
  and exists (select 1 from public.estudos_cursos c where c.id = curso_id and c.versao = curso_versao and c.status = 'revisao_pastoral')
);

drop policy if exists estudos_curso_manifestacoes_update_v2 on public.estudos_curso_manifestacoes_pastorais;
create policy estudos_curso_manifestacoes_update_v2 on public.estudos_curso_manifestacoes_pastorais for update to authenticated using (
  revisor_id = public.usuario_atual_id()
  and public.admin_tem_permissao('estudos.review')
) with check (
  revisor_id = public.usuario_atual_id()
  and public.admin_tem_permissao('estudos.review')
  and exists (select 1 from public.estudos_curso_revisores r where r.curso_id = curso_id and r.revisor_id = public.usuario_atual_id())
  and exists (select 1 from public.estudos_cursos c where c.id = curso_id and c.versao = curso_versao and c.status = 'revisao_pastoral')
);

create or replace function public.estudos_definir_fontes_curso(p_curso_id uuid, p_fonte_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_ids uuid[] := coalesce(p_fonte_ids, '{}'::uuid[]);
begin
  if not public.admin_tem_permissao('estudos.manage') then raise exception 'PERMISSION_DENIED'; end if;
  if not exists (select 1 from public.estudos_cursos c where c.id = p_curso_id and c.status = 'rascunho') then
    raise exception 'CURSO_NAO_EDITAVEL';
  end if;
  if cardinality(v_ids) > 20 then raise exception 'LIMITE_DE_FONTES_EXCEDIDO'; end if;
  if cardinality(v_ids) <> (select count(distinct fonte_id) from unnest(v_ids) as selected(fonte_id)) then raise exception 'FONTES_DUPLICADAS'; end if;
  if exists (
    select 1 from unnest(v_ids) as selected(fonte_id)
    left join public.plataforma_fontes_conhecimento f on f.id = selected.fonte_id
    where f.id is null or not f.ativo or f.status <> 'ready' or f.escopo not in ('global', 'ebd', 'estudos', 'formacao')
  ) then raise exception 'FONTE_RAG_INVALIDA'; end if;

  delete from public.estudos_curso_fontes where curso_id = p_curso_id;
  insert into public.estudos_curso_fontes (curso_id, fonte_id, vinculado_por)
  select p_curso_id, selected.fonte_id, public.usuario_atual_id()
  from unnest(v_ids) as selected(fonte_id);
end;
$$;

revoke all on function public.estudos_definir_fontes_curso(uuid, uuid[]) from public;
grant execute on function public.estudos_definir_fontes_curso(uuid, uuid[]) to authenticated;

create or replace function public.estudos_substituir_blocos_aula(p_aula_id uuid, p_blocos jsonb)
returns setof public.estudos_aula_blocos language plpgsql security invoker set search_path = public as $$
declare
  v_total integer;
begin
  if not public.admin_tem_permissao('estudos.manage') then raise exception 'PERMISSION_DENIED'; end if;
  if jsonb_typeof(p_blocos) <> 'array' then raise exception 'BLOCOS_INVALIDOS'; end if;
  v_total := jsonb_array_length(p_blocos);
  if v_total > 20 then raise exception 'LIMITE_DE_BLOCOS_EXCEDIDO'; end if;
  if not exists (
    select 1 from public.estudos_aulas a
    join public.estudos_modulos m on m.id = a.modulo_id
    join public.estudos_cursos c on c.id = m.curso_id
    where a.id = p_aula_id and a.status = 'rascunho' and c.status = 'rascunho'
  ) then raise exception 'AULA_NAO_EDITAVEL'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_blocos) as b(tipo text, titulo text, resumo text, conteudo jsonb, ordem integer, obrigatorio boolean)
    where b.tipo not in ('video', 'scripture', 'context', 'reflection', 'mission', 'meeting', 'audio', 'resource')
      or char_length(btrim(coalesce(b.titulo, ''))) not between 1 and 180
      or b.ordem is null or b.ordem < 1
      or b.obrigatorio is null
  ) then raise exception 'BLOCO_INVALIDO'; end if;
  if v_total <> (
    select count(distinct b.ordem)
    from jsonb_to_recordset(p_blocos) as b(ordem integer)
  ) then raise exception 'ORDEM_DE_BLOCOS_DUPLICADA'; end if;

  delete from public.estudos_aula_blocos where aula_id = p_aula_id;
  return query
  insert into public.estudos_aula_blocos (aula_id, tipo, titulo, resumo, conteudo, ordem, obrigatorio)
  select p_aula_id, b.tipo, b.titulo, coalesce(b.resumo, ''), coalesce(b.conteudo, '{}'::jsonb), b.ordem, b.obrigatorio
  from jsonb_to_recordset(p_blocos) as b(tipo text, titulo text, resumo text, conteudo jsonb, ordem integer, obrigatorio boolean)
  order by b.ordem
  returning *;
end;
$$;

revoke all on function public.estudos_substituir_blocos_aula(uuid, jsonb) from public;
grant execute on function public.estudos_substituir_blocos_aula(uuid, jsonb) to authenticated;

create or replace function public.estudos_concluir_bloco(p_bloco_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid := public.usuario_atual_id();
  v_bloco public.estudos_aula_blocos%rowtype;
  v_aula public.estudos_aulas%rowtype;
  v_modulo public.estudos_modulos%rowtype;
  v_curso public.estudos_cursos%rowtype;
  v_total integer;
  v_concluidos integer;
  v_certificado public.estudos_certificados%rowtype;
begin
  if v_usuario is null then raise exception 'USER_NOT_AUTHENTICATED'; end if;

  select * into v_bloco from public.estudos_aula_blocos where id = p_bloco_id;
  if not found then raise exception 'BLOCO_NAO_ENCONTRADO'; end if;
  select * into v_aula from public.estudos_aulas where id = v_bloco.aula_id;
  select * into v_modulo from public.estudos_modulos where id = v_aula.modulo_id;
  select * into v_curso from public.estudos_cursos where id = v_modulo.curso_id;

  if v_curso.status <> 'publicado' or v_aula.status <> 'publicada' then raise exception 'CONTEUDO_NAO_PUBLICADO'; end if;

  if exists (
    select 1
    from public.estudos_aulas pa
    join public.estudos_modulos pm on pm.id = pa.modulo_id
    join public.estudos_aula_blocos pb on pb.aula_id = pa.id and pb.obrigatorio
    where pm.curso_id = v_curso.id and pa.status = 'publicada'
      and (pm.ordem < v_modulo.ordem or (pm.ordem = v_modulo.ordem and pa.ordem < v_aula.ordem))
      and not exists (
        select 1 from public.estudos_aula_progresso pp
        where pp.bloco_id = pb.id and pp.usuario_id = v_usuario
          and pp.curso_versao = v_curso.versao and pp.aula_versao = pa.versao
      )
  ) then raise exception 'ETAPA_ANTERIOR_PENDENTE'; end if;

  insert into public.estudos_matriculas (curso_id, usuario_id, curso_versao)
  values (v_curso.id, v_usuario, v_curso.versao) on conflict do nothing;

  insert into public.estudos_aula_progresso (curso_id, aula_id, bloco_id, usuario_id, curso_versao, aula_versao)
  values (v_curso.id, v_aula.id, v_bloco.id, v_usuario, v_curso.versao, v_aula.versao)
  on conflict do nothing;

  select count(*) into v_total
  from public.estudos_aula_blocos b
  join public.estudos_aulas a on a.id = b.aula_id and a.status = 'publicada'
  join public.estudos_modulos m on m.id = a.modulo_id
  where m.curso_id = v_curso.id and b.obrigatorio;

  select count(*) into v_concluidos
  from public.estudos_aula_progresso p
  join public.estudos_aula_blocos b on b.id = p.bloco_id and b.obrigatorio
  join public.estudos_aulas a on a.id = p.aula_id and a.status = 'publicada' and a.versao = p.aula_versao
  join public.estudos_modulos m on m.id = a.modulo_id
  where m.curso_id = v_curso.id and p.usuario_id = v_usuario and p.curso_versao = v_curso.versao;

  if v_total > 0 and v_concluidos >= v_total then
    update public.estudos_matriculas set concluido_em = coalesce(concluido_em, now())
    where curso_id = v_curso.id and usuario_id = v_usuario and curso_versao = v_curso.versao;
    if v_curso.certificado_habilitado then
      insert into public.estudos_certificados (curso_id, usuario_id, curso_versao)
      values (v_curso.id, v_usuario, v_curso.versao)
      on conflict (curso_id, usuario_id, curso_versao) do update set curso_id = excluded.curso_id
      returning * into v_certificado;
    end if;
  end if;

  return jsonb_build_object(
    'cursoId', v_curso.id,
    'aulaId', v_aula.id,
    'concluidos', v_concluidos,
    'total', v_total,
    'percentual', case when v_total = 0 then 0 else round((v_concluidos::numeric / v_total::numeric) * 100) end,
    'certificadoId', v_certificado.id,
    'codigoValidacao', v_certificado.codigo_validacao
  );
end;
$$;

revoke all on function public.estudos_concluir_bloco(uuid) from public;
grant execute on function public.estudos_concluir_bloco(uuid) to authenticated;

create or replace function public.estudos_publicar_curso(p_curso_id uuid)
returns public.estudos_cursos language plpgsql security definer set search_path = public as $$
declare
  v_curso public.estudos_cursos%rowtype;
begin
  if not public.admin_tem_permissao('estudos.publish') then raise exception 'PERMISSION_DENIED'; end if;
  select * into v_curso from public.estudos_cursos where id = p_curso_id for update;
  if not found then raise exception 'CURSO_NAO_ENCONTRADO'; end if;
  if v_curso.status <> 'revisao_pastoral' then raise exception 'CURSO_FORA_DA_REVISAO'; end if;
  if not exists (
    select 1 from public.estudos_curso_manifestacoes_pastorais m
    where m.curso_id = v_curso.id and m.curso_versao = v_curso.versao
  ) then raise exception 'MANIFESTACAO_PASTORAL_PENDENTE'; end if;
  if not exists (
    select 1 from public.estudos_modulos mo
    join public.estudos_aulas a on a.modulo_id = mo.id and a.status = 'publicada'
    join public.estudos_aula_blocos b on b.aula_id = a.id
    where mo.curso_id = v_curso.id
  ) then raise exception 'CURSO_SEM_CONTEUDO_PUBLICAVEL'; end if;

  update public.estudos_cursos set status = 'publicado', publicado_em = now(), publicado_por = public.usuario_atual_id(), atualizado_em = now()
  where id = v_curso.id returning * into v_curso;
  update public.estudos_trilhas set status = 'publicada', atualizado_em = now() where id = v_curso.trilha_id and status = 'rascunho';
  return v_curso;
end;
$$;

revoke all on function public.estudos_publicar_curso(uuid) from public;
grant execute on function public.estudos_publicar_curso(uuid) to authenticated;

comment on table public.estudos_cursos is 'Unidade principal do catálogo e da certificação pastoral.';
comment on table public.estudos_aulas is 'Unidade pedagógica consumida dentro de módulo e curso ordenados.';
comment on table public.estudos_certificados is 'Certificado de conclusão integral do curso, com código verificável e validade pastoral.';
comment on table public.estudos_curso_fontes is 'Fontes oficiais da memória RAG explicitamente vinculadas ao curso.';
comment on table public.estudos_ai_execucoes is 'Auditoria privada das gerações assistidas de aulas do Comunhão Estudos.';
comment on function public.estudos_concluir_bloco(uuid) is 'Registra progresso ordenado no servidor e emite certificado ao concluir todos os blocos obrigatórios publicados.';
comment on function public.estudos_publicar_curso(uuid) is 'Publica curso somente por permissão própria, após manifestação pastoral registrada na versão vigente.';
comment on function public.estudos_substituir_blocos_aula(uuid, jsonb) is 'Substitui atomicamente os blocos de uma aula ainda em rascunho.';
