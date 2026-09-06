-- Comunhão Estudos — fundação editorial e progresso
-- Esta migration é aditiva. Não altera o EBD nem prova aplicação remota.

insert into public.admin_roles (code, name, description) values
  ('editor_estudos', 'Editor Estudos', 'Organização e edição do Comunhão Estudos.'),
  ('revisor_estudos', 'Revisor Estudos', 'Manifestação pastoral simples sobre estudos atribuídos.')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.admin_permissions (code, module, description) values
  ('estudos.review', 'estudos', 'Visualizar estudos atribuídos e registrar manifestação pastoral.'),
  ('estudos.manage', 'estudos', 'Criar e editar estudos e suas composições.'),
  ('estudos.publish', 'estudos', 'Publicar versões definidas do Comunhão Estudos.')
on conflict (code) do update set module = excluded.module, description = excluded.description;

insert into public.admin_role_permissions (role_code, permission_code) values
  ('editor_estudos', 'estudos.manage'),
  ('revisor_estudos', 'estudos.review')
on conflict do nothing;

create table if not exists public.estudos_temporadas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
  descricao text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'arquivada')),
  ordem integer not null default 0 check (ordem >= 0),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.estudos_estudos (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.estudos_temporadas(id) on delete cascade,
  semana integer not null check (semana between 1 and 52),
  slug text not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  objetivo text not null default '',
  referencia_biblica text not null default '',
  descricao text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'revisao_pastoral', 'definido', 'publicado', 'arquivado')),
  publicado_em timestamptz,
  publicado_por uuid references public.usuarios(id) on delete set null,
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (temporada_id, slug),
  unique (temporada_id, semana)
);

create table if not exists public.estudos_blocos (
  id uuid primary key default gen_random_uuid(),
  estudo_id uuid not null references public.estudos_estudos(id) on delete cascade,
  tipo text not null check (tipo in ('video', 'scripture', 'context', 'reflection', 'mission', 'meeting', 'audio', 'resource')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  resumo text not null default '',
  conteudo jsonb not null default '{}'::jsonb,
  ordem integer not null check (ordem >= 0),
  concluivel boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (estudo_id, ordem)
);

create table if not exists public.estudos_revisores (
  id uuid primary key default gen_random_uuid(),
  estudo_id uuid not null references public.estudos_estudos(id) on delete cascade,
  revisor_id uuid not null references public.usuarios(id) on delete cascade,
  atribuido_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (estudo_id, revisor_id)
);

create table if not exists public.estudos_manifestacoes_pastorais (
  id uuid primary key default gen_random_uuid(),
  estudo_id uuid not null references public.estudos_estudos(id) on delete cascade,
  revisor_id uuid not null references public.usuarios(id) on delete cascade,
  versao integer not null check (versao > 0),
  manifestacao text not null check (manifestacao in ('gostei', 'ficou_bom')),
  criado_em timestamptz not null default now(),
  unique (estudo_id, revisor_id, versao)
);

create table if not exists public.estudos_progresso (
  id uuid primary key default gen_random_uuid(),
  estudo_id uuid not null references public.estudos_estudos(id) on delete cascade,
  bloco_id uuid not null references public.estudos_blocos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  versao integer not null check (versao > 0),
  concluido_em timestamptz not null default now(),
  unique (estudo_id, bloco_id, usuario_id, versao)
);

create index if not exists estudos_estudos_temporada_idx on public.estudos_estudos (temporada_id, semana);
create index if not exists estudos_blocos_estudo_idx on public.estudos_blocos (estudo_id, ordem);
create index if not exists estudos_progresso_usuario_idx on public.estudos_progresso (usuario_id, estudo_id);
create index if not exists estudos_manifestacoes_estudo_idx on public.estudos_manifestacoes_pastorais (estudo_id, versao);

alter table public.estudos_temporadas enable row level security;
alter table public.estudos_estudos enable row level security;
alter table public.estudos_blocos enable row level security;
alter table public.estudos_revisores enable row level security;
alter table public.estudos_manifestacoes_pastorais enable row level security;
alter table public.estudos_progresso enable row level security;

drop policy if exists estudos_temporadas_select on public.estudos_temporadas;
create policy estudos_temporadas_select on public.estudos_temporadas
  for select to authenticated using (status = 'publicada' or public.admin_tem_permissao('estudos.manage') or public.admin_tem_permissao('estudos.review'));

drop policy if exists estudos_estudos_select on public.estudos_estudos;
create policy estudos_estudos_select on public.estudos_estudos
  for select to authenticated using (
    status = 'publicado'
    or public.admin_tem_permissao('estudos.manage')
    or (public.admin_tem_permissao('estudos.review') and exists (
      select 1 from public.estudos_revisores r
      where r.estudo_id = estudos_estudos.id
        and r.revisor_id = public.usuario_atual_id()
    ))
  );

drop policy if exists estudos_blocos_select on public.estudos_blocos;
create policy estudos_blocos_select on public.estudos_blocos
  for select to authenticated using (exists (
    select 1 from public.estudos_estudos e
    where e.id = estudos_blocos.estudo_id
      and (e.status = 'publicado' or public.admin_tem_permissao('estudos.manage') or (
        public.admin_tem_permissao('estudos.review') and exists (
          select 1 from public.estudos_revisores r where r.estudo_id = e.id and r.revisor_id = public.usuario_atual_id()
        )
      ))
  ));

drop policy if exists estudos_revisores_select on public.estudos_revisores;
create policy estudos_revisores_select on public.estudos_revisores
  for select to authenticated using (revisor_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage'));

drop policy if exists estudos_manifestacoes_select on public.estudos_manifestacoes_pastorais;
create policy estudos_manifestacoes_select on public.estudos_manifestacoes_pastorais
  for select to authenticated using (revisor_id = public.usuario_atual_id() or public.admin_tem_permissao('estudos.manage'));

drop policy if exists estudos_manifestacoes_insert on public.estudos_manifestacoes_pastorais;
create policy estudos_manifestacoes_insert on public.estudos_manifestacoes_pastorais
  for insert to authenticated with check (
    revisor_id = public.usuario_atual_id()
    and public.admin_tem_permissao('estudos.review')
    and exists (select 1 from public.estudos_revisores r where r.estudo_id = estudos_manifestacoes_pastorais.estudo_id and r.revisor_id = public.usuario_atual_id())
    and exists (select 1 from public.estudos_estudos e where e.id = estudos_manifestacoes_pastorais.estudo_id and e.versao = estudos_manifestacoes_pastorais.versao and e.status = 'revisao_pastoral')
  );

drop policy if exists estudos_progresso_select on public.estudos_progresso;
create policy estudos_progresso_select on public.estudos_progresso
  for select to authenticated using (usuario_id = public.usuario_atual_id());

drop policy if exists estudos_progresso_insert on public.estudos_progresso;
create policy estudos_progresso_insert on public.estudos_progresso
  for insert to authenticated with check (
    usuario_id = public.usuario_atual_id()
    and exists (select 1 from public.estudos_estudos e where e.id = estudos_progresso.estudo_id and e.status = 'publicado' and e.versao = estudos_progresso.versao)
    and exists (select 1 from public.estudos_blocos b where b.id = estudos_progresso.bloco_id and b.estudo_id = estudos_progresso.estudo_id and b.concluivel)
  );

comment on table public.estudos_manifestacoes_pastorais is 'Manifestação simples do revisor pastoral; não concede edição nem publicação.';
comment on table public.estudos_progresso is 'Progresso privado do titular por estudo, bloco e versão publicada.';
