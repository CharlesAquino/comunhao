-- Completa o acompanhamento privado sem abrir os pedidos ao acesso direto.

drop function if exists public.listar_meus_pedidos_oracao();
create function public.listar_meus_pedidos_oracao()
returns table (
  id uuid, categoria text, intencao text, visibilidade text, acompanhamento text,
  status text, criado_em timestamptz, expira_em timestamptz,
  total_intercessores bigint, total_confirmacoes bigint, ultima_confirmacao_em timestamptz,
  ultima_mensagem text, ultimo_intercessor_nome text
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.categoria, p.intencao, p.visibilidade, p.acompanhamento,
         case when p.status in ('aberto', 'acolhido') and p.expira_em <= now() then 'expirado' else p.status end,
         p.criado_em, p.expira_em,
         count(i.id), count(i.id) filter (where i.status = 'concluida'), max(i.concluida_em),
         (select recent.mensagem from public.oracao_intercessoes recent
          where recent.pedido_id = p.id and recent.status = 'concluida' and recent.mensagem is not null
          order by recent.concluida_em desc limit 1),
         (select intercessor.nome from public.oracao_intercessoes recent
          join public.usuarios intercessor on intercessor.id = recent.intercessor_id
          where recent.pedido_id = p.id and recent.status = 'concluida' and recent.mensagem is not null
          order by recent.concluida_em desc limit 1)
  from public.oracao_pedidos p
  left join public.oracao_intercessoes i on i.pedido_id = p.id
  where p.autor_id = public.usuario_atual_id()
  group by p.id
  order by p.criado_em desc;
$$;
revoke all on function public.listar_meus_pedidos_oracao() from public, anon;
grant execute on function public.listar_meus_pedidos_oracao() to authenticated;

