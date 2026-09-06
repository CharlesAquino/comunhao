-- Relatório unificado de resgates imediatos e retiradas de reservas.

create or replace function public.cantina_relatorio_resgates(p_evento_id uuid default null)
returns table (
  registro_id uuid, origem text, evento_id uuid, evento_nome text,
  usuario_id uuid, usuario_nome text, usuario_username text,
  produto_nome text, quantidade integer, valor_unitario_kesef integer,
  total_kesef integer, status text, realizado_em timestamptz,
  operador_id uuid, operador_nome text, representante_nome text
)
language sql stable security definer set search_path='' as $$
  select r.id, 'imediato'::text, r.evento_id, e.nome,
    r.beneficiario_id, u.nome, u.username, i.produto_nome, i.quantidade,
    i.valor_unitario_kesef, i.subtotal_kesef, r.status,
    coalesce(r.confirmado_em,r.criado_em), r.operador_id, op.nome, null::text
  from public.cantina_resgates r
  join public.cantina_resgate_itens i on i.resgate_id=r.id
  join public.cantina_eventos e on e.id=r.evento_id
  left join public.usuarios u on u.id=r.beneficiario_id
  join public.usuarios op on op.id=r.operador_id
  where public.admin_tem_permissao('canteen.reports.read')
    and (p_evento_id is null or r.evento_id=p_evento_id)
    and r.status='concluido'
  union all
  select cr.id, 'reserva'::text, cr.evento_id, e.nome,
    cr.usuario_id, u.nome, u.username, p.nome, cr.quantidade,
    cr.valor_unitario_kesef, cr.kesef_aprovisionado, cr.status,
    coalesce(cr.retirada_em,cr.atualizado_em,cr.reservada_em), cr.processado_por_id,
    op.nome, rep.nome
  from public.cantina_reservas cr
  join public.cantina_eventos e on e.id=cr.evento_id
  join public.cantina_anuncios a on a.id=cr.anuncio_id
  join public.cantina_produtos p on p.id=a.produto_id
  join public.usuarios u on u.id=cr.usuario_id
  left join public.usuarios op on op.id=cr.processado_por_id
  left join public.usuarios rep on rep.id=cr.representante_id
  where public.admin_tem_permissao('canteen.reports.read')
    and (p_evento_id is null or cr.evento_id=p_evento_id)
    and cr.status in ('retirada','doada')
  order by 13 desc;
$$;

revoke all on function public.cantina_relatorio_resgates(uuid) from public,anon;
grant execute on function public.cantina_relatorio_resgates(uuid) to authenticated;
