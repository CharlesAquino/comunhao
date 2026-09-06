begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loja_itens' and column_name = 'imagem_url_claro'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loja_itens' and column_name = 'imagem_url_escuro'
  ) then
    raise exception 'colunas de imagem temática ausentes';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - imagens da loja por tema';
rollback;
