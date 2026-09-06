-- Agent Editorial EBD: memória editorial mínima, ferramentas rastreáveis e
-- autonomia limitada a rascunhos. Esta tabela nunca armazena pedidos pessoais
-- ou dados de oração; seu domínio é exclusivamente o conteúdo editorial EBD.

create table if not exists public.ebd_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null default 'ebd-editorial'
    check (agent_key = 'ebd-editorial'),
  lesson_id text not null references public.ebd_editorial_lessons(id) on delete cascade,
  weekday text not null
    check (weekday in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  actor_user_id uuid references public.usuarios(id) on delete set null,
  execution_id uuid references public.ebd_ai_executions(id) on delete set null,
  objective text not null check (char_length(trim(objective)) between 8 and 1000),
  context_snapshot jsonb not null default '{}'::jsonb,
  tool_trace jsonb not null default '[]'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  status text not null default 'running'
    check (status in ('running', 'draft_ready', 'failed')),
  approval_state text not null default 'draft'
    check (approval_state = 'draft'),
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ebd_agent_runs_lesson_day
  on public.ebd_agent_runs(lesson_id, weekday, created_at desc);
create index if not exists idx_ebd_agent_runs_actor
  on public.ebd_agent_runs(actor_user_id, created_at desc);

alter table public.ebd_agent_runs enable row level security;

drop policy if exists ebd_agent_runs_admin_select on public.ebd_agent_runs;
create policy ebd_agent_runs_admin_select
on public.ebd_agent_runs for select
to authenticated
using (public.admin_tem_permissao('ebd.manage'));

-- As escritas são exclusivamente da Edge Function (service role). Assim, um
-- cliente não consegue forjar uma aprovação, publicar nem alterar o histórico.
revoke insert, update, delete on public.ebd_agent_runs from authenticated, anon;
grant select on public.ebd_agent_runs to authenticated;

comment on table public.ebd_agent_runs is
  'Auditoria do Agente Editorial EBD. O agente só prepara rascunhos; publicação continua humana.';
