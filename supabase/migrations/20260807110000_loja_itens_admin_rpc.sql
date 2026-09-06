create or replace function public.admin_criar_item_loja(
  p_nome text,
  p_descricao text,
  p_preco_kesef integer,
  p_estoque integer,
  p_categoria text,
  p_imagem_url text,
  p_imagem_url_claro text,
  p_imagem_url_escuro text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.loja_itens;
begin
  if not public.admin_tem_permissao('store.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 2
     or length(btrim(coalesce(p_descricao, ''))) < 8
     or p_preco_kesef is null or p_preco_kesef <= 0
     or p_estoque is null or p_estoque < 0
     or nullif(btrim(coalesce(p_categoria, '')), '') is null
     or nullif(btrim(coalesce(p_imagem_url_claro, '')), '') is null
     or nullif(btrim(coalesce(p_imagem_url_escuro, '')), '') is null then
    raise exception 'DADOS_PRODUTO_INVALIDOS';
  end if;

  insert into public.loja_itens (
    nome, descricao, preco_kesef, estoque, categoria, ativo,
    imagem_url, imagem_url_claro, imagem_url_escuro
  ) values (
    btrim(p_nome), btrim(p_descricao), p_preco_kesef, p_estoque,
    btrim(p_categoria), true, p_imagem_url, p_imagem_url_claro, p_imagem_url_escuro
  )
  returning * into v_item;

  return to_jsonb(v_item);
end;
$$;

create or replace function public.admin_atualizar_item_loja(
  p_item_id uuid,
  p_nome text,
  p_descricao text,
  p_preco_kesef integer,
  p_estoque integer,
  p_categoria text,
  p_imagem_url text,
  p_imagem_url_claro text,
  p_imagem_url_escuro text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_tem_permissao('store.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 2
     or length(btrim(coalesce(p_descricao, ''))) < 8
     or p_preco_kesef is null or p_preco_kesef <= 0
     or p_estoque is null or p_estoque < 0
     or nullif(btrim(coalesce(p_categoria, '')), '') is null
     or nullif(btrim(coalesce(p_imagem_url_claro, '')), '') is null
     or nullif(btrim(coalesce(p_imagem_url_escuro, '')), '') is null then
    raise exception 'DADOS_PRODUTO_INVALIDOS';
  end if;

  update public.loja_itens
  set nome = btrim(p_nome),
      descricao = btrim(p_descricao),
      preco_kesef = p_preco_kesef,
      estoque = p_estoque,
      categoria = btrim(p_categoria),
      imagem_url = p_imagem_url,
      imagem_url_claro = p_imagem_url_claro,
      imagem_url_escuro = p_imagem_url_escuro
  where id = p_item_id;

  if not found then
    raise exception 'ITEM_NAO_ENCONTRADO';
  end if;
end;
$$;

revoke all on function public.admin_criar_item_loja(text, text, integer, integer, text, text, text, text) from public, anon;
grant execute on function public.admin_criar_item_loja(text, text, integer, integer, text, text, text, text) to authenticated;
revoke all on function public.admin_atualizar_item_loja(uuid, text, text, integer, integer, text, text, text, text) from public, anon;
grant execute on function public.admin_atualizar_item_loja(uuid, text, text, integer, integer, text, text, text, text) to authenticated;
