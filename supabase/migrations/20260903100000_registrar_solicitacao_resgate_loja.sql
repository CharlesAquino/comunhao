-- Cada pedido novo inicia sua própria linha do tempo.
create or replace function public.registrar_historico_solicitacao_pedido_loja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.loja_pedido_historico (pedido_id, tipo, titulo, descricao, ocorrido_em)
  values (new.id, 'solicitado', 'Solicitação recebida', 'Seu resgate foi registrado e aguarda processamento.', new.solicitado_em);
  return new;
end;
$$;

drop trigger if exists loja_pedido_registrar_solicitacao on public.loja_pedidos;
create trigger loja_pedido_registrar_solicitacao
after insert on public.loja_pedidos
for each row execute function public.registrar_historico_solicitacao_pedido_loja();
