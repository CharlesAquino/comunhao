alter table public.loja_itens
  add column if not exists imagem_url_claro text,
  add column if not exists imagem_url_escuro text;

comment on column public.loja_itens.imagem_url_claro is
  'Imagem do produto exibida exclusivamente no tema claro.';
comment on column public.loja_itens.imagem_url_escuro is
  'Imagem do produto exibida exclusivamente no tema escuro.';
