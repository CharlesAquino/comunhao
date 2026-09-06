-- Auditoria das gerações de conteúdo do Estúdio Editorial EBD.

create table if not exists public.ebd_ai_executions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text references public.ebd_editorial_lessons(id) on delete set null,
  user_id uuid references public.usuarios(id) on delete set null,
  weekday text not null,
  model text not null,
  prompt_version text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ebd_ai_executions_lesson
  on public.ebd_ai_executions(lesson_id, created_at desc);
create index if not exists idx_ebd_ai_executions_user
  on public.ebd_ai_executions(user_id, created_at desc);

alter table public.ebd_ai_executions enable row level security;

drop policy if exists "ebd_ai_executions_admin_select" on public.ebd_ai_executions;
create policy "ebd_ai_executions_admin_select"
on public.ebd_ai_executions for select
to authenticated
using (
  exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth.uid() and u.papel = 'admin'
  )
);

-- Escritas são feitas somente pela Edge Function com service role.
revoke insert, update, delete on public.ebd_ai_executions from authenticated, anon;
grant select on public.ebd_ai_executions to authenticated;
