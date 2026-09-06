delete from public.loja_itens
where lower(btrim(nome)) in (
  lower('Chaveiro Comunhão'),
  lower('Cupom Cantina'),
  lower('Bíblia de Estudo'),
  lower('Devocional 30 Dias'),
  lower('Camiseta Comunhão')
);
