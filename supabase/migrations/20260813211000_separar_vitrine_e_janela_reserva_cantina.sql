-- O anúncio fica visível assim que publicado. A janela de reserva continua
-- independente e é informada pelos campos reservas_abrem_em/reservas_fecham_em.

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
    and now() < coalesce(a.disponivel_ate, e.fim_em)
    and e.status in ('anunciado', 'reservas_abertas', 'reservas_encerradas', 'aberto')
    and e.fim_em > now()
    and p.ativo = true
    and l.status in ('confirmado', 'esgotado')
  order by e.inicio_em, a.ordem, p.nome;
$$;

revoke all on function public.cantina_listar_vitrine() from public, anon;
grant execute on function public.cantina_listar_vitrine() to authenticated;

