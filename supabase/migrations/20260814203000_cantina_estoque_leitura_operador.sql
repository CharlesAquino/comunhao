-- O operador do caixa precisa ler o catálogo e o saldo disponível para montar
-- o resgate, sem receber permissão para criar ou alterar estoque.

create or replace function public.cantina_listar_estoque_evento(p_evento_id uuid)
returns table (
  lote_id uuid, produto_id uuid, produto_nome text, descricao text, unidade text,
  alergenicos text[], imagem_url text, quantidade_recebida integer, quantidade_disponivel integer,
  validade_em timestamptz, conservacao text, origem text, anuncio_id uuid,
  anuncio_status text, valor_kesef integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, p.id, p.nome, p.descricao, p.unidade, p.alergenicos, p.imagem_url,
         l.quantidade_recebida, l.quantidade_disponivel, l.validade_em, l.conservacao,
         c.origem, a.id, a.status, a.valor_kesef
  from public.cantina_lotes l
  join public.cantina_produtos p on p.id = l.produto_id
  left join public.cantina_contribuicoes c on c.id = l.contribuicao_id
  left join public.cantina_anuncios a on a.lote_id = l.id
  where l.evento_id = p_evento_id
    and (
      public.admin_tem_permissao('canteen.inventory.manage')
      or public.admin_tem_permissao('canteen.checkout.operate')
    )
  order by l.criado_em desc;
$$;

revoke all on function public.cantina_listar_estoque_evento(uuid) from public, anon;
grant execute on function public.cantina_listar_estoque_evento(uuid) to authenticated;
