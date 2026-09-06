create table if not exists public.auth_login_unlocks (
  username_normalizado text primary key,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  motivo text not null
);

alter table public.auth_login_unlocks enable row level security;
revoke all on table public.auth_login_unlocks from public, anon, authenticated;
grant all on table public.auth_login_unlocks to service_role;

insert into public.auth_login_unlocks (
  username_normalizado,
  expira_em,
  motivo
) values (
  'sarinha',
  now() + interval '1 hour',
  'Desbloqueio solicitado pelo responsável administrativo em 03/08/2026'
)
on conflict (username_normalizado) do update
set criado_em = now(),
    expira_em = excluded.expira_em,
    motivo = excluded.motivo;
