-- A comunidade usa somente o login já registrado pela autenticação.
-- Nenhum heartbeat, presença contínua ou horário de atividade é exposto.
drop function if exists public.registrar_presenca_comunidade();
drop function if exists public.listar_mocidade_por_atividade();
drop table if exists public.comunidade_presenca;

create or replace function public.listar_mocidade_por_ultimo_login()
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
  order by u.last_login desc nulls last,
           lower(u.nome) asc,
           u.id asc;
end;
$$;

revoke all on function public.listar_mocidade_por_ultimo_login() from public, anon;
grant execute on function public.listar_mocidade_por_ultimo_login() to authenticated;
