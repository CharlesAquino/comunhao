-- Presença comunitária guarda somente o último sinal necessário para ordenação.
-- O horário não é exposto aos demais membros; apenas a RPC ordenada é pública.
create table if not exists public.comunidade_presenca (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  ultimo_sinal_em timestamptz not null default now()
);

alter table public.comunidade_presenca enable row level security;
revoke all on table public.comunidade_presenca from public, anon, authenticated;

create or replace function public.registrar_presenca_comunidade()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
begin
  if auth.uid() is null or v_usuario_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  insert into public.comunidade_presenca (usuario_id, ultimo_sinal_em)
  values (v_usuario_id, now())
  on conflict (usuario_id) do update
  set ultimo_sinal_em = excluded.ultimo_sinal_em;
end;
$$;

create or replace function public.listar_mocidade_por_atividade()
returns table (
  id uuid,
  nome text,
  status_anel text,
  foto_url text,
  perfil_capa text,
  xp integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null or public.usuario_atual_id() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  return query
  select
    u.id,
    u.nome::text,
    u.status_anel::text,
    u.foto_url::text,
    u.perfil_capa::text,
    coalesce(u.xp, 0)::integer
  from public.usuarios u
  left join public.comunidade_presenca p on p.usuario_id = u.id
  order by coalesce(p.ultimo_sinal_em, u.last_login, u.criado_em) desc nulls last,
           lower(u.nome) asc,
           u.id asc;
end;
$$;

revoke all on function public.registrar_presenca_comunidade() from public, anon;
grant execute on function public.registrar_presenca_comunidade() to authenticated;
revoke all on function public.listar_mocidade_por_atividade() from public, anon;
grant execute on function public.listar_mocidade_por_atividade() to authenticated;
