-- Biblioteca editorial privada: não integra snapshots publicados nem o RAG top-k.
create table public.ebd_source_days (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.ebd_editorial_lessons(id) on delete cascade,
  lesson_key text not null,
  weekday text not null check (weekday in ('monday','tuesday','wednesday','thursday','friday','saturday')),
  revision integer not null check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  unique (lesson_id, lesson_key, weekday, revision),
  check ((payload->>'schemaVersion' = 'comunhao.ebd.source.v1') is true),
  check ((payload->>'lessonKey' = lesson_key) is true),
  check ((payload->>'weekday' = weekday) is true),
  check (((payload->>'revision')::integer = revision) is true),
  check ((jsonb_typeof(payload->'day'->'blocks') = 'array' and jsonb_array_length(payload->'day'->'blocks') = 10) is true),
  check (octet_length(payload::text) <= 524288)
);
alter table public.ebd_source_days enable row level security;
create index ebd_source_days_creator on public.ebd_source_days(created_by);
revoke all on public.ebd_source_days from anon, authenticated;
grant select, insert on public.ebd_source_days to authenticated;
create policy ebd_source_days_read on public.ebd_source_days for select to authenticated
  using (public.admin_tem_permissao('ebd.manage'));
create policy ebd_source_days_insert on public.ebd_source_days for insert to authenticated
  with check (public.admin_tem_permissao('ebd.manage') and created_by = auth.uid());
comment on table public.ebd_source_days is 'Pacotes editoriais de autoria importados, privados e imutáveis por revisão. Não são aprovação nem publicação.';
