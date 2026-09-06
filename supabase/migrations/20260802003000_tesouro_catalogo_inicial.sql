-- Catálogo editorial inicial do Tesouro.
-- Preços seguem o contrato vigente de Kesef quando já definido.

insert into public.loja_itens (
  id, nome, descricao, preco_kesef, estoque, imagem_url, categoria, ativo
) values
  (
    'aa100001-2026-4802-9000-000000000001',
    'Bíblia de Estudo',
    'Ferramentas e recursos para aprofundar a leitura e a aplicação da Palavra.',
    500,
    4,
    '/store-products/biblia.webp',
    'destaque',
    true
  ),
  (
    'aa100001-2026-4802-9000-000000000002',
    'Garrafa Térmica',
    'Acompanhe seus dias com leveza, cuidado e propósito.',
    200,
    12,
    '/store-products/garrafa.webp',
    'comunhão',
    true
  ),
  (
    'aa100001-2026-4802-9000-000000000003',
    'Devocional Diário',
    'Um caderno para registrar aprendizados, orações e gratidão.',
    150,
    10,
    '/store-products/devocional.webp',
    'discipulado',
    true
  )
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_kesef = excluded.preco_kesef,
  imagem_url = excluded.imagem_url,
  categoria = excluded.categoria,
  ativo = excluded.ativo;

