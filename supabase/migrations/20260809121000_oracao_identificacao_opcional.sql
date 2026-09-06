-- Separa o alcance do pedido da decisão de revelar a identidade do autor.

alter table public.oracao_pedidos
  add column if not exists identificado boolean not null default false;

-- Preserva exatamente a apresentação dos pedidos criados antes desta evolução.
update public.oracao_pedidos
set identificado = visibilidade <> 'anonimo_comunidade'
where identificado = false;

create or replace function public.criar_pedido_oracao_v2(
  p_categoria text,
  p_intencao text,
  p_visibilidade text,
  p_identificado boolean,
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
  if p_visibilidade not in ('dupla', 'intercessores', 'lideranca') then raise exception 'VISIBILIDADE_INVALIDA'; end if;
  if p_acompanhamento not in ('somente_oracao', 'mensagem', 'conversa') then raise exception 'ACOMPANHAMENTO_INVALIDO'; end if;
  if p_dias_validade not in (1, 3, 7) then raise exception 'VALIDADE_INVALIDA'; end if;
  if char_length(btrim(coalesce(p_intencao, ''))) > 1200 then raise exception 'INTENCAO_MUITO_LONGA'; end if;

  insert into public.oracao_pedidos (
    autor_id, categoria, intencao, visibilidade, identificado,
    acompanhamento, expira_em
  ) values (
    v_user, p_categoria, nullif(btrim(coalesce(p_intencao, '')), ''),
    p_visibilidade, coalesce(p_identificado, false), p_acompanhamento,
    now() + make_interval(days => p_dias_validade)
  ) returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.criar_pedido_oracao_v2(text,text,text,boolean,text,integer) from public, anon;
grant execute on function public.criar_pedido_oracao_v2(text,text,text,boolean,text,integer) to authenticated;

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
    case when not p.identificado or p.visibilidade = 'anonimo_comunidade' then 'Pedido reservado' else u.nome end,
    case when not p.identificado or p.visibilidade = 'anonimo_comunidade' then null else u.foto_url end,
    not p.identificado or p.visibilidade = 'anonimo_comunidade', i.id, i.status
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

revoke all on function public.listar_pedidos_oracao_disponiveis(integer) from public, anon;
grant execute on function public.listar_pedidos_oracao_disponiveis(integer) to authenticated;
