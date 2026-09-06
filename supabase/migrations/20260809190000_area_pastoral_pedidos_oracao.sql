-- Área Pastoral: fila privada de cuidado, isolada das demais operações administrativas.

insert into public.admin_permissions (code, module, description) values
  ('pastoral.read', 'pastoral', 'Visualizar pedidos encaminhados ao cuidado pastoral.'),
  ('pastoral.manage', 'pastoral', 'Registrar acolhimento, acompanhamento e assistência pastoral.')
on conflict (code) do update set module = excluded.module, description = excluded.description;

insert into public.admin_role_permissions (role_code, permission_code) values
  ('pastoral', 'pastoral.read'),
  ('pastoral', 'pastoral.manage')
on conflict do nothing;

-- A função pastoral passa a operar pela área própria e não pelo módulo de
-- sorteio/supervisão geral de oração.
delete from public.admin_role_permissions
where role_code = 'pastoral' and permission_code in ('prayer.read', 'prayer.manage', 'prayer.draw');

-- O administrador continua com acesso integral às novas permissões.
insert into public.admin_role_permissions (role_code, permission_code) values
  ('administrador', 'pastoral.read'),
  ('administrador', 'pastoral.manage')
on conflict do nothing;

create table if not exists public.pastoral_acompanhamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.oracao_pedidos(id) on delete cascade,
  status text not null default 'novo'
    check (status in ('novo', 'em_acolhimento', 'acompanhamento', 'encaminhado', 'concluido', 'arquivado')),
  prioridade text not null default 'normal'
    check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  tipo_cuidado text not null default 'oracao'
    check (tipo_cuidado in ('oracao', 'escuta', 'visita', 'assistencia', 'encaminhamento')),
  responsavel_id uuid references public.usuarios(id) on delete set null,
  observacoes text check (char_length(observacoes) <= 3000),
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references public.usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create index if not exists pastoral_acompanhamentos_fila_idx
  on public.pastoral_acompanhamentos(status, prioridade, atualizado_em desc);

alter table public.pastoral_acompanhamentos enable row level security;
revoke all on public.pastoral_acompanhamentos from anon, authenticated;

create or replace function public.listar_pedidos_pastorais()
returns table (
  id uuid, categoria text, intencao text, visibilidade text, identificado boolean,
  acompanhamento text, pedido_status text, criado_em timestamptz, expira_em timestamptz,
  autor_id uuid, autor_nome text, autor_foto text,
  total_intercessores bigint, total_confirmacoes bigint,
  cuidado_status text, prioridade text, tipo_cuidado text,
  responsavel_id uuid, responsavel_nome text, observacoes text, atualizado_em timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('pastoral.read') then
    raise exception 'ACESSO_PASTORAL_NEGADO';
  end if;

  return query
  select
    p.id, p.categoria, p.intencao, p.visibilidade, p.identificado,
    p.acompanhamento, p.status, p.criado_em, p.expira_em,
    case when p.identificado then p.autor_id else null end,
    case when p.identificado then u.nome else 'Pedido reservado' end,
    case when p.identificado then u.foto_url else null end,
    count(i.id), count(i.id) filter (where i.status = 'concluida'),
    coalesce(pa.status, 'novo'), coalesce(pa.prioridade, 'normal'), coalesce(pa.tipo_cuidado, 'oracao'),
    pa.responsavel_id, responsavel.nome, pa.observacoes, pa.atualizado_em
  from public.oracao_pedidos p
  join public.usuarios u on u.id = p.autor_id
  left join public.oracao_intercessoes i on i.pedido_id = p.id
  left join public.pastoral_acompanhamentos pa on pa.pedido_id = p.id
  left join public.usuarios responsavel on responsavel.id = pa.responsavel_id
  where p.status in ('aberto', 'acolhido')
    and p.expira_em > now()
  group by p.id, u.id, pa.id, responsavel.id
  order by
    case coalesce(pa.prioridade, 'normal') when 'urgente' then 0 when 'alta' then 1 when 'normal' then 2 else 3 end,
    p.criado_em;
end;
$$;

create or replace function public.salvar_acompanhamento_pastoral(
  p_pedido_id uuid,
  p_status text,
  p_prioridade text,
  p_tipo_cuidado text,
  p_observacoes text default null,
  p_atribuir_a_mim boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := public.usuario_atual_id();
begin
  if not public.admin_tem_permissao('pastoral.manage') then
    raise exception 'GESTAO_PASTORAL_NEGADA';
  end if;
  if p_status not in ('novo', 'em_acolhimento', 'acompanhamento', 'encaminhado', 'concluido', 'arquivado') then
    raise exception 'STATUS_PASTORAL_INVALIDO';
  end if;
  if p_prioridade not in ('baixa', 'normal', 'alta', 'urgente') then
    raise exception 'PRIORIDADE_PASTORAL_INVALIDA';
  end if;
  if p_tipo_cuidado not in ('oracao', 'escuta', 'visita', 'assistencia', 'encaminhamento') then
    raise exception 'TIPO_CUIDADO_INVALIDO';
  end if;
  if char_length(btrim(coalesce(p_observacoes, ''))) > 3000 then
    raise exception 'OBSERVACAO_MUITO_LONGA';
  end if;
  if not exists (
    select 1 from public.oracao_pedidos
    where id = p_pedido_id and status in ('aberto', 'acolhido')
  ) then
    raise exception 'PEDIDO_PASTORAL_INDISPONIVEL';
  end if;

  insert into public.pastoral_acompanhamentos (
    pedido_id, status, prioridade, tipo_cuidado, responsavel_id,
    observacoes, criado_por, atualizado_por
  ) values (
    p_pedido_id, p_status, p_prioridade, p_tipo_cuidado,
    case when p_atribuir_a_mim then v_actor else null end,
    nullif(btrim(coalesce(p_observacoes, '')), ''), v_actor, v_actor
  )
  on conflict (pedido_id) do update set
    status = excluded.status,
    prioridade = excluded.prioridade,
    tipo_cuidado = excluded.tipo_cuidado,
    responsavel_id = case
      when p_atribuir_a_mim then v_actor
      else public.pastoral_acompanhamentos.responsavel_id
    end,
    observacoes = excluded.observacoes,
    atualizado_por = v_actor,
    atualizado_em = now();

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_actor, 'pastoral.manage', 'pastoral.care.update', 'oracao_pedido', p_pedido_id::text,
    jsonb_build_object('status', p_status, 'prioridade', p_prioridade, 'tipo_cuidado', p_tipo_cuidado),
    'Atualização do acompanhamento pastoral'
  );
end;
$$;

revoke all on function public.listar_pedidos_pastorais() from public, anon;
revoke all on function public.salvar_acompanhamento_pastoral(uuid,text,text,text,text,boolean) from public, anon;
grant execute on function public.listar_pedidos_pastorais() to authenticated;
grant execute on function public.salvar_acompanhamento_pastoral(uuid,text,text,text,text,boolean) to authenticated;

comment on table public.pastoral_acompanhamentos is
  'Registro confidencial de cuidado pastoral; não concede acesso a outros módulos administrativos.';

-- Projeção pública mínima para brasões: revela somente a família visual da
-- função, nunca permissões, motivo da atribuição ou histórico administrativo.
create or replace function public.listar_brasoes_institucionais_publicos(p_usuario_ids uuid[])
returns table (usuario_id uuid, brasao text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if coalesce(array_length(p_usuario_ids, 1), 0) > 200 then raise exception 'LIMITE_DE_PERFIS_EXCEDIDO'; end if;

  return query
  select
    u.id,
    case
      when u.papel = 'admin' or bool_or(ra.role_code = 'administrador') then 'administrador'
      when bool_or(ra.role_code = 'pastoral') then 'pastoral'
      when u.papel = 'mod' or bool_or(ra.role_code in ('guardiao', 'editor_ebd', 'revisor_ebd', 'operador_loja', 'tecnico')) then 'equipe'
      else null
    end
  from public.usuarios u
  left join public.admin_role_assignments ra on ra.usuario_id = u.id and ra.active
  where u.id = any(coalesce(p_usuario_ids, array[]::uuid[]))
  group by u.id, u.papel
  having u.papel in ('admin', 'mod')
    or bool_or(ra.role_code in ('administrador', 'pastoral', 'guardiao', 'editor_ebd', 'revisor_ebd', 'operador_loja', 'tecnico'));
end;
$$;

revoke all on function public.listar_brasoes_institucionais_publicos(uuid[]) from public, anon;
grant execute on function public.listar_brasoes_institucionais_publicos(uuid[]) to authenticated;
