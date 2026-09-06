-- Autoatendimento do direito de exclusão.
-- A solicitação bloqueia novos logins e cria uma fila auditável para o expurgo
-- ou anonimização conforme a política de retenção vigente.

create table if not exists public.solicitacoes_exclusao_conta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  auth_user_id uuid not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_processamento', 'concluida', 'cancelada')),
  solicitada_em timestamptz not null default now(),
  prevista_para timestamptz not null default (now() + interval '15 days'),
  concluida_em timestamptz,
  observacao_operacional text,
  unique (usuario_id)
);

alter table public.solicitacoes_exclusao_conta enable row level security;

drop policy if exists solicitacoes_exclusao_select_own on public.solicitacoes_exclusao_conta;
create policy solicitacoes_exclusao_select_own
on public.solicitacoes_exclusao_conta
for select to authenticated
using (auth_user_id = auth.uid());

revoke all on public.solicitacoes_exclusao_conta from public, anon;
grant select on public.solicitacoes_exclusao_conta to authenticated;

create or replace function public.solicitar_exclusao_minha_conta()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_usuario_id uuid;
  v_prevista_para timestamptz := now() + interval '15 days';
begin
  if v_auth_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_usuario_id
  from public.usuarios
  where auth_user_id = v_auth_uid;

  if v_usuario_id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.solicitacoes_exclusao_conta (
    usuario_id, auth_user_id, status, solicitada_em, prevista_para,
    concluida_em, observacao_operacional
  ) values (
    v_usuario_id, v_auth_uid, 'pendente', now(), v_prevista_para,
    null, null
  )
  on conflict (usuario_id) do update set
    auth_user_id = excluded.auth_user_id,
    status = 'pendente',
    solicitada_em = excluded.solicitada_em,
    prevista_para = excluded.prevista_para,
    concluida_em = null,
    observacao_operacional = null;

  update public.usuarios
  set status_anel = 'offline'
  where id = v_usuario_id;

  return v_prevista_para;
end;
$$;

revoke all on function public.solicitar_exclusao_minha_conta() from public, anon;
grant execute on function public.solicitar_exclusao_minha_conta() to authenticated;

comment on table public.solicitacoes_exclusao_conta is
  'Fila auditável de solicitações do titular para exclusão/anonimização de conta.';

