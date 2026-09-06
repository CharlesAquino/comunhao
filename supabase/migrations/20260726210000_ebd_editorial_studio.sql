-- Estúdio Editorial EBD v1: documentos flexíveis, revisão e versões publicadas.

create table if not exists public.ebd_editorial_lessons (
  id text primary key,
  numero integer not null check (numero > 0),
  titulo text not null check (char_length(trim(titulo)) >= 3),
  subtitulo text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  versao integer not null default 0 check (versao >= 0),
  documento jsonb not null default '{}'::jsonb,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  publicado_em timestamptz
);

create table if not exists public.ebd_editorial_versions (
  id uuid primary key default gen_random_uuid(),
  licao_id text not null references public.ebd_editorial_lessons(id) on delete cascade,
  versao integer not null check (versao > 0),
  documento jsonb not null,
  titulo text not null,
  subtitulo text not null default '',
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (licao_id, versao)
);

create index if not exists idx_ebd_editorial_status
  on public.ebd_editorial_lessons(status, publicado_em desc);
create index if not exists idx_ebd_editorial_versions_licao
  on public.ebd_editorial_versions(licao_id, versao desc);

create or replace function public.ebd_editorial_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_ebd_editorial_updated_at on public.ebd_editorial_lessons;
create trigger trg_ebd_editorial_updated_at
before update on public.ebd_editorial_lessons
for each row execute function public.ebd_editorial_touch_updated_at();

alter table public.ebd_editorial_lessons enable row level security;
alter table public.ebd_editorial_versions enable row level security;

drop policy if exists "ebd_editorial_publicados_select" on public.ebd_editorial_lessons;
create policy "ebd_editorial_publicados_select"
on public.ebd_editorial_lessons for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

drop policy if exists "ebd_editorial_admin_all" on public.ebd_editorial_lessons;
create policy "ebd_editorial_admin_all"
on public.ebd_editorial_lessons for all
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

drop policy if exists "ebd_editorial_versions_admin_select" on public.ebd_editorial_versions;
create policy "ebd_editorial_versions_admin_select"
on public.ebd_editorial_versions for select
to authenticated
using (
  exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

create or replace function public.publicar_ebd_editorial(p_licao_id text)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_id uuid;
  v_licao public.ebd_editorial_lessons%rowtype;
  v_versao integer;
begin
  select id into v_admin_id
  from public.usuarios
  where auth_user_id = auth.uid() and papel = 'admin';

  if v_admin_id is null then
    raise exception 'Apenas administradores podem publicar lições';
  end if;

  select * into v_licao
  from public.ebd_editorial_lessons
  where id = p_licao_id
  for update;

  if not found then
    raise exception 'Lição editorial não encontrada';
  end if;

  if jsonb_array_length(coalesce(v_licao.documento->'days', '[]'::jsonb)) <> 7 then
    raise exception 'A lição precisa conter os sete dias antes da publicação';
  end if;

  v_versao := v_licao.versao + 1;

  insert into public.ebd_editorial_versions (
    licao_id, versao, documento, titulo, subtitulo, criado_por
  ) values (
    v_licao.id, v_versao, v_licao.documento, v_licao.titulo,
    v_licao.subtitulo, v_admin_id
  );

  update public.ebd_editorial_lessons
  set status = 'published', versao = v_versao, publicado_em = now()
  where id = p_licao_id;

  return v_versao;
end;
$$;

revoke all on function public.publicar_ebd_editorial(text) from public;
grant execute on function public.publicar_ebd_editorial(text) to authenticated;

