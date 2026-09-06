-- Publicação controlada e vitrine autenticada da Cantina dentro do Tesouro.

create or replace function public.cantina_publicar_evento(p_evento_id uuid)
returns public.cantina_eventos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_evento public.cantina_eventos;
begin
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if not public.admin_tem_permissao('canteen.events.manage')
     or not public.admin_tem_permissao('canteen.inventory.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  select * into v_evento
  from public.cantina_eventos
  where id = p_evento_id
  for update;

  if v_evento.id is null then raise exception 'EVENTO_NAO_ENCONTRADO'; end if;
  if v_evento.status not in ('rascunho', 'anunciado', 'reservas_abertas') then
    raise exception 'EVENTO_NAO_PUBLICAVEL';
  end if;
  if v_evento.fim_em <= now() then raise exception 'EVENTO_JA_ENCERRADO'; end if;

  if not exists (
    select 1
    from public.cantina_anuncios a
    join public.cantina_lotes l on l.id = a.lote_id
    join public.cantina_produtos p on p.id = a.produto_id
    where a.evento_id = p_evento_id
      and a.status in ('rascunho', 'pronto_para_revisao', 'publicado')
      and a.valor_kesef > 0
      and l.status = 'confirmado'
      and l.quantidade_disponivel > 0
      and p.ativo = true
      and nullif(btrim(p.descricao), '') is not null
      and nullif(btrim(p.imagem_url), '') is not null
  ) then
    raise exception 'EVENTO_SEM_ANUNCIO_COMPLETO';
  end if;

  update public.cantina_anuncios a
     set status = 'publicado',
         disponivel_de = coalesce(a.disponivel_de, v_evento.reservas_abrem_em, v_evento.inicio_em),
         disponivel_ate = coalesce(a.disponivel_ate, v_evento.fim_em),
         atualizado_em = now()
   where a.evento_id = p_evento_id
     and a.status in ('rascunho', 'pronto_para_revisao')
     and a.valor_kesef > 0
     and exists (
       select 1 from public.cantina_lotes l
       where l.id = a.lote_id and l.status = 'confirmado' and l.quantidade_disponivel > 0
     )
     and exists (
       select 1 from public.cantina_produtos p
       where p.id = a.produto_id and p.ativo = true
         and nullif(btrim(p.descricao), '') is not null
         and nullif(btrim(p.imagem_url), '') is not null
     );

  update public.cantina_eventos
     set status = case
       when now() >= inicio_em then 'aberto'
       when reservas_abrem_em is not null and now() >= reservas_abrem_em
         and (reservas_fecham_em is null or now() < reservas_fecham_em) then 'reservas_abertas'
       else 'anunciado'
     end,
     atualizado_por = v_usuario_id,
     atualizado_em = now()
   where id = p_evento_id
   returning * into v_evento;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_usuario_id, 'canteen.events.manage', 'publish_storefront', 'cantina_evento', p_evento_id::text,
    jsonb_build_object('status', v_evento.status),
    'Publicação da vitrine eventual da Cantina no Tesouro'
  );

  return v_evento;
end;
$$;

create or replace function public.cantina_listar_vitrine()
returns table (
  anuncio_id uuid,
  evento_id uuid,
  evento_nome text,
  evento_tipo text,
  evento_local text,
  inicio_em timestamptz,
  fim_em timestamptz,
  reservas_abrem_em timestamptz,
  reservas_fecham_em timestamptz,
  evento_status text,
  produto_nome text,
  descricao text,
  unidade text,
  alergenicos text[],
  imagem_url text,
  valor_kesef integer,
  limite_por_membro integer,
  quantidade_reservavel integer,
  quantidade_disponivel integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id, e.id, e.nome, e.tipo, e.local, e.inicio_em, e.fim_em,
    e.reservas_abrem_em, e.reservas_fecham_em, e.status,
    p.nome, p.descricao, p.unidade, p.alergenicos, p.imagem_url,
    a.valor_kesef, a.limite_por_membro,
    least(a.quantidade_reservavel, l.quantidade_disponivel),
    l.quantidade_disponivel
  from public.cantina_anuncios a
  join public.cantina_eventos e on e.id = a.evento_id
  join public.cantina_produtos p on p.id = a.produto_id
  join public.cantina_lotes l on l.id = a.lote_id
  where auth.uid() is not null
    and a.status = 'publicado'
    and now() >= a.disponivel_de
    and now() < a.disponivel_ate
    and e.status in ('anunciado', 'reservas_abertas', 'reservas_encerradas', 'aberto')
    and e.fim_em > now()
    and p.ativo = true
    and l.status in ('confirmado', 'esgotado')
  order by e.inicio_em, a.ordem, p.nome;
$$;

revoke all on function public.cantina_publicar_evento(uuid) from public, anon;
grant execute on function public.cantina_publicar_evento(uuid) to authenticated;
revoke all on function public.cantina_listar_vitrine() from public, anon;
grant execute on function public.cantina_listar_vitrine() to authenticated;

