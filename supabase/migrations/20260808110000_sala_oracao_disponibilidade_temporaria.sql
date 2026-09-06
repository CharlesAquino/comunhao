create table if not exists public.oracao_disponibilidades (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  modalidades text[] not null default array['silencio']::text[],
  disponivel_ate timestamptz not null,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  check (modalidades <@ array['silencio','texto','voz','video']::text[] and cardinality(modalidades) > 0)
);

alter table public.oracao_disponibilidades enable row level security;
drop policy if exists oracao_disponibilidade_propria on public.oracao_disponibilidades;
create policy oracao_disponibilidade_propria on public.oracao_disponibilidades for select to authenticated
using (usuario_id = public.usuario_atual_id());
grant select on public.oracao_disponibilidades to authenticated;
revoke insert, update, delete on public.oracao_disponibilidades from authenticated;

create or replace function public.configurar_disponibilidade_oracao(p_minutos integer, p_modalidades text[])
returns public.oracao_disponibilidades
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := public.usuario_atual_id(); v_result public.oracao_disponibilidades;
begin
  if v_user is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_minutos not in (15, 30, 60) then raise exception 'DURACAO_INVALIDA'; end if;
  if p_modalidades is null or cardinality(p_modalidades) = 0
     or not (p_modalidades <@ array['silencio','texto','voz','video']::text[]) then raise exception 'MODALIDADES_INVALIDAS'; end if;
  insert into public.oracao_disponibilidades(usuario_id, modalidades, disponivel_ate, ativo, atualizado_em)
  values (v_user, p_modalidades, now() + make_interval(mins => p_minutos), true, now())
  on conflict (usuario_id) do update set modalidades = excluded.modalidades, disponivel_ate = excluded.disponivel_ate, ativo = true, atualizado_em = now()
  returning * into v_result;
  update public.usuarios set status_anel = 'disponivel' where id = v_user;
  return v_result;
end;
$$;

create or replace function public.encerrar_disponibilidade_oracao()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := public.usuario_atual_id();
begin
  update public.oracao_disponibilidades set ativo = false, atualizado_em = now() where usuario_id = v_user;
  update public.usuarios set status_anel = 'offline' where id = v_user;
end;
$$;

create or replace function public.listar_disponiveis_oracao()
returns table(usuario_id uuid, nome text, foto_url text, modalidades text[], disponivel_ate timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.nome, u.foto_url, d.modalidades, d.disponivel_ate
  from public.oracao_disponibilidades d join public.usuarios u on u.id = d.usuario_id
  where d.ativo and d.disponivel_ate > now() and d.usuario_id <> public.usuario_atual_id()
  order by d.atualizado_em desc limit 30;
$$;

create or replace function public.obter_minha_disponibilidade_oracao()
returns public.oracao_disponibilidades
language sql stable security definer set search_path = ''
as $$ select * from public.oracao_disponibilidades where usuario_id = public.usuario_atual_id(); $$;

revoke all on function public.configurar_disponibilidade_oracao(integer,text[]) from public, anon;
revoke all on function public.encerrar_disponibilidade_oracao() from public, anon;
revoke all on function public.listar_disponiveis_oracao() from public, anon;
revoke all on function public.obter_minha_disponibilidade_oracao() from public, anon;
grant execute on function public.configurar_disponibilidade_oracao(integer,text[]) to authenticated;
grant execute on function public.encerrar_disponibilidade_oracao() to authenticated;
grant execute on function public.listar_disponiveis_oracao() to authenticated;
grant execute on function public.obter_minha_disponibilidade_oracao() to authenticated;

