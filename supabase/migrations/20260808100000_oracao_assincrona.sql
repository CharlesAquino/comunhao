-- Oração assíncrona: pedido privado, acolhimento e confirmação de intercessão.

create table if not exists public.oracao_pedidos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.usuarios(id) on delete cascade,
  categoria text not null default 'outro'
    check (categoria in ('familia', 'saude', 'fe', 'estudos', 'trabalho', 'relacionamentos', 'outro')),
  intencao text check (char_length(intencao) <= 1200),
  visibilidade text not null default 'intercessores'
    check (visibilidade in ('dupla', 'intercessores', 'lideranca', 'anonimo_comunidade')),
  acompanhamento text not null default 'somente_oracao'
    check (acompanhamento in ('somente_oracao', 'mensagem', 'conversa')),
  status text not null default 'aberto'
    check (status in ('aberto', 'acolhido', 'encerrado', 'expirado', 'cancelado')),
  expira_em timestamptz not null default (now() + interval '3 days'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  encerrado_em timestamptz
);

create index if not exists oracao_pedidos_abertos_idx
on public.oracao_pedidos(status, expira_em, criado_em desc);
create index if not exists oracao_pedidos_autor_idx
on public.oracao_pedidos(autor_id, criado_em desc);

create table if not exists public.oracao_intercessoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.oracao_pedidos(id) on delete cascade,
  intercessor_id uuid not null references public.usuarios(id) on delete cascade,
  status text not null default 'assumida'
    check (status in ('assumida', 'concluida', 'desistiu')),
  mensagem text check (char_length(mensagem) <= 500),
  assumida_em timestamptz not null default now(),
  concluida_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (pedido_id, intercessor_id)
);

create index if not exists oracao_intercessoes_usuario_idx
on public.oracao_intercessoes(intercessor_id, atualizado_em desc);

alter table public.oracao_pedidos enable row level security;
alter table public.oracao_intercessoes enable row level security;

drop policy if exists oracao_pedidos_autor_select on public.oracao_pedidos;
create policy oracao_pedidos_autor_select on public.oracao_pedidos for select to authenticated
using (autor_id = public.usuario_atual_id());
drop policy if exists oracao_intercessoes_participantes_select on public.oracao_intercessoes;
create policy oracao_intercessoes_participantes_select on public.oracao_intercessoes for select to authenticated
using (
  intercessor_id = public.usuario_atual_id()
  or exists (select 1 from public.oracao_pedidos p where p.id = pedido_id and p.autor_id = public.usuario_atual_id())
);

grant select on public.oracao_pedidos, public.oracao_intercessoes to authenticated;
revoke insert, update, delete on public.oracao_pedidos, public.oracao_intercessoes from authenticated;

create or replace function public.criar_pedido_oracao(
  p_categoria text,
  p_intencao text,
  p_visibilidade text,
  p_acompanhamento text,
  p_dias_validade integer default 3
)
returns public.oracao_pedidos
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.usuario_atual_id();
  v_result public.oracao_pedidos;
begin
  if v_user is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_categoria not in ('familia', 'saude', 'fe', 'estudos', 'trabalho', 'relacionamentos', 'outro') then raise exception 'CATEGORIA_INVALIDA'; end if;
  if p_visibilidade not in ('dupla', 'intercessores', 'lideranca', 'anonimo_comunidade') then raise exception 'VISIBILIDADE_INVALIDA'; end if;
  if p_acompanhamento not in ('somente_oracao', 'mensagem', 'conversa') then raise exception 'ACOMPANHAMENTO_INVALIDO'; end if;
  if p_dias_validade not in (1, 3, 7) then raise exception 'VALIDADE_INVALIDA'; end if;
  if char_length(btrim(coalesce(p_intencao, ''))) > 1200 then raise exception 'INTENCAO_MUITO_LONGA'; end if;

  insert into public.oracao_pedidos (autor_id, categoria, intencao, visibilidade, acompanhamento, expira_em)
  values (v_user, p_categoria, nullif(btrim(coalesce(p_intencao, '')), ''), p_visibilidade, p_acompanhamento, now() + make_interval(days => p_dias_validade))
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.listar_pedidos_oracao_disponiveis(p_limite integer default 20)
returns table (
  id uuid, categoria text, intencao text, acompanhamento text, criado_em timestamptz,
  expira_em timestamptz, autor_nome text, autor_foto text, anonimo boolean,
  minha_intercessao_id uuid, minha_intercessao_status text
)
language sql stable security definer set search_path = ''
as $$
  with me as (select public.usuario_atual_id() id)
  select
    p.id, p.categoria, p.intencao, p.acompanhamento, p.criado_em, p.expira_em,
    case when p.visibilidade = 'anonimo_comunidade' then 'Pedido reservado' else u.nome end,
    case when p.visibilidade = 'anonimo_comunidade' then null else u.foto_url end,
    p.visibilidade = 'anonimo_comunidade', i.id, i.status
  from public.oracao_pedidos p
  join public.usuarios u on u.id = p.autor_id
  cross join me
  left join public.oracao_intercessoes i on i.pedido_id = p.id and i.intercessor_id = me.id
  where me.id is not null
    and p.autor_id <> me.id
    and p.status in ('aberto', 'acolhido')
    and p.expira_em > now()
    and (
      p.visibilidade in ('intercessores', 'anonimo_comunidade')
      or (p.visibilidade = 'dupla' and exists (
        select 1 from public.usuarios atual
        where atual.id = me.id and (atual.orando_por_id = p.autor_id or u.orando_por_id = me.id)
      ))
      or (p.visibilidade = 'lideranca' and public.admin_tem_permissao('prayer.read'))
    )
  order by (i.status = 'assumida') desc nulls last, p.criado_em
  limit least(greatest(coalesce(p_limite, 20), 1), 50);
$$;

create or replace function public.listar_meus_pedidos_oracao()
returns table (
  id uuid, categoria text, intencao text, visibilidade text, acompanhamento text,
  status text, criado_em timestamptz, expira_em timestamptz,
  total_intercessores bigint, total_confirmacoes bigint, ultima_confirmacao_em timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.categoria, p.intencao, p.visibilidade, p.acompanhamento, p.status,
         p.criado_em, p.expira_em,
         count(i.id), count(i.id) filter (where i.status = 'concluida'), max(i.concluida_em)
  from public.oracao_pedidos p
  left join public.oracao_intercessoes i on i.pedido_id = p.id
  where p.autor_id = public.usuario_atual_id()
  group by p.id
  order by p.criado_em desc;
$$;

create or replace function public.acolher_pedido_oracao(p_pedido_id uuid)
returns public.oracao_intercessoes
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.usuario_atual_id();
  v_pedido public.oracao_pedidos;
  v_result public.oracao_intercessoes;
begin
  if v_user is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  select * into v_pedido from public.oracao_pedidos where id = p_pedido_id for update;
  if v_pedido.id is null or v_pedido.status not in ('aberto', 'acolhido') or v_pedido.expira_em <= now() then raise exception 'PEDIDO_INDISPONIVEL'; end if;
  if v_pedido.autor_id = v_user then raise exception 'PEDIDO_PROPRIO'; end if;
  if v_pedido.visibilidade = 'lideranca' and not public.admin_tem_permissao('prayer.read') then raise exception 'PEDIDO_INDISPONIVEL'; end if;
  if v_pedido.visibilidade = 'dupla' and not exists (
    select 1 from public.usuarios atual join public.usuarios autor on autor.id = v_pedido.autor_id
    where atual.id = v_user and (atual.orando_por_id = v_pedido.autor_id or autor.orando_por_id = v_user)
  ) then raise exception 'PEDIDO_INDISPONIVEL'; end if;

  insert into public.oracao_intercessoes (pedido_id, intercessor_id, status)
  values (p_pedido_id, v_user, 'assumida')
  on conflict (pedido_id, intercessor_id) do update set status = 'assumida', atualizado_em = now(), concluida_em = null
  returning * into v_result;
  update public.oracao_pedidos set status = 'acolhido', atualizado_em = now() where id = p_pedido_id;

  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  values (
    v_pedido.autor_id, 'pedido_oracao_acolhido', 'Orando por você!',
    'Alguém acolheu seu pedido e vai interceder por você.', '/oracao?aba=meus',
    jsonb_build_object('pedido_id', p_pedido_id),
    'oracao:pedido:' || p_pedido_id::text || ':acolhido:' || v_user::text
  ) on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  return v_result;
end;
$$;

create or replace function public.confirmar_intercessao_oracao(p_intercessao_id uuid, p_mensagem text default null)
returns public.oracao_intercessoes
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := public.usuario_atual_id();
  v_result public.oracao_intercessoes;
  v_autor uuid;
  v_permite_mensagem boolean;
begin
  select p.autor_id, p.acompanhamento <> 'somente_oracao'
  into v_autor, v_permite_mensagem
  from public.oracao_intercessoes i join public.oracao_pedidos p on p.id = i.pedido_id
  where i.id = p_intercessao_id and i.intercessor_id = v_user;
  if v_autor is null then raise exception 'INTERCESSAO_NAO_ENCONTRADA'; end if;

  update public.oracao_intercessoes set
    status = 'concluida', concluida_em = now(), atualizado_em = now(),
    mensagem = case when v_permite_mensagem then nullif(btrim(coalesce(p_mensagem, '')), '') else null end
  where id = p_intercessao_id returning * into v_result;

  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados, evento_chave)
  values (
    v_autor, 'intercessao_confirmada', 'Alguém orou por você',
    'Sua intenção foi lembrada em oração hoje.', '/oracao?aba=meus',
    jsonb_build_object('pedido_id', v_result.pedido_id, 'intercessao_id', v_result.id),
    'oracao:intercessao:' || v_result.id::text || ':concluida'
  ) on conflict (usuario_id, evento_chave) where evento_chave is not null do nothing;
  return v_result;
end;
$$;

create or replace function public.encerrar_pedido_oracao(p_pedido_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.oracao_pedidos set status = 'encerrado', encerrado_em = now(), atualizado_em = now()
  where id = p_pedido_id and autor_id = public.usuario_atual_id() and status in ('aberto', 'acolhido');
  if not found then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
end;
$$;

revoke all on function public.criar_pedido_oracao(text,text,text,text,integer) from public, anon;
revoke all on function public.listar_pedidos_oracao_disponiveis(integer) from public, anon;
revoke all on function public.listar_meus_pedidos_oracao() from public, anon;
revoke all on function public.acolher_pedido_oracao(uuid) from public, anon;
revoke all on function public.confirmar_intercessao_oracao(uuid,text) from public, anon;
revoke all on function public.encerrar_pedido_oracao(uuid) from public, anon;
grant execute on function public.criar_pedido_oracao(text,text,text,text,integer) to authenticated;
grant execute on function public.listar_pedidos_oracao_disponiveis(integer) to authenticated;
grant execute on function public.listar_meus_pedidos_oracao() to authenticated;
grant execute on function public.acolher_pedido_oracao(uuid) to authenticated;
grant execute on function public.confirmar_intercessao_oracao(uuid,text) to authenticated;
grant execute on function public.encerrar_pedido_oracao(uuid) to authenticated;

alter table public.oracao_pedidos replica identity full;
alter table public.oracao_intercessoes replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.oracao_pedidos;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.oracao_intercessoes;
exception when duplicate_object then null; end $$;
