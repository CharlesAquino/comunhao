create or replace function public.cantina_listar_vitrine()
returns table(anuncio_id uuid,evento_id uuid,evento_nome text,evento_tipo text,evento_local text,inicio_em timestamptz,fim_em timestamptz,reservas_abrem_em timestamptz,reservas_fecham_em timestamptz,evento_status text,produto_nome text,descricao text,unidade text,alergenicos text[],imagem_url text,valor_kesef integer,limite_por_membro integer,quantidade_reservavel integer,quantidade_disponivel integer)
language plpgsql volatile security definer set search_path='' as $$
begin
  update public.cantina_eventos ce set status=case
    when now()>=ce.fim_em then 'encerrado'
    when now()>=ce.inicio_em then 'aberto'
    when ce.reservas_abrem_em is not null and now()>=ce.reservas_abrem_em
      and (ce.reservas_fecham_em is null or now()<ce.reservas_fecham_em) then 'reservas_abertas'
    when ce.reservas_fecham_em is not null and now()>=ce.reservas_fecham_em then 'reservas_encerradas'
    else 'anunciado' end,
    atualizado_em=now()
  where ce.status in ('anunciado','reservas_abertas','reservas_encerradas','aberto');

  return query
  select a.id,e.id,e.nome,e.tipo,e.local,e.inicio_em,e.fim_em,
    e.reservas_abrem_em,e.reservas_fecham_em,e.status,p.nome,p.descricao,
    p.unidade,p.alergenicos,p.imagem_url,a.valor_kesef,a.limite_por_membro,
    least(a.quantidade_reservavel,l.quantidade_disponivel),l.quantidade_disponivel
  from public.cantina_anuncios a
  join public.cantina_eventos e on e.id=a.evento_id
  join public.cantina_produtos p on p.id=a.produto_id
  join public.cantina_lotes l on l.id=a.lote_id
  where auth.uid() is not null and a.status='publicado'
    and now()<coalesce(a.disponivel_ate,e.fim_em)
    and e.status in ('anunciado','reservas_abertas','reservas_encerradas','aberto')
    and e.fim_em>now() and p.ativo and l.status in ('confirmado','esgotado')
  order by e.inicio_em,a.ordem,p.nome;
end; $$;

revoke all on function public.cantina_listar_vitrine() from public,anon;
grant execute on function public.cantina_listar_vitrine() to authenticated;

