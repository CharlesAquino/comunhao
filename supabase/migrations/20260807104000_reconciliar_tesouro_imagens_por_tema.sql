alter table public.loja_itens
  add column if not exists imagem_url_claro text,
  add column if not exists imagem_url_escuro text;

comment on column public.loja_itens.imagem_url_claro is
  'Imagem do produto exibida exclusivamente no tema claro.';
comment on column public.loja_itens.imagem_url_escuro is
  'Imagem do produto exibida exclusivamente no tema escuro.';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loja_itens' and column_name = 'imagem_url_claro'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loja_itens' and column_name = 'imagem_url_escuro'
  ) then
    raise exception 'Não foi possível reconciliar as colunas de imagem temática da loja.';
  end if;
end;
$$;
