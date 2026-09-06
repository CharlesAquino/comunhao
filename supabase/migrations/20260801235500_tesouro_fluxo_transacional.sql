-- Tesouro: saldo correto, solicitação idempotente e processamento atômico.

alter table public.loja_pedidos
  add column if not exists idempotencia_chave uuid;

create unique index if not exists loja_pedidos_usuario_idempotencia_unique
  on public.loja_pedidos (usuario_id, idempotencia_chave)
  where idempotencia_chave is not null;

-- Serializa débitos do mesmo usuário para impedir saldo negativo em chamadas
-- concorrentes. O lock é liberado automaticamente no fim da transação.
create or replace function public.debitar_kesef(
  p_usuario_id uuid,
  p_quantidade integer,
  p_referencia_id uuid default null
)
returns public.kesef_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
  v_registro public.kesef_ledger;
begin
  if p_quantidade <= 0 then
    raise exception 'QUANTIDADE_INVALIDA';
  end if;

  if auth.uid() is not null
     and p_usuario_id is distinct from public.usuario_atual_id()
     and not public.admin_tem_permissao('store.manage')
     and not public.admin_tem_permissao('economy.adjust') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  perform 1
  from public.usuarios
  where id = p_usuario_id
  for update;

  if not found then
    raise exception 'USUARIO_NAO_ENCONTRADO';
  end if;

  select coalesce(sum(k.quantidade), 0)::integer
    into v_saldo
  from public.kesef_ledger k
  where k.usuario_id = p_usuario_id;

  if v_saldo < p_quantidade then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (p_usuario_id, 'resgate', -p_quantidade, p_referencia_id)
  returning * into v_registro;

  return v_registro;
end;
$$;

create or replace function public.solicitar_resgate_loja(
  p_item_id uuid,
  p_quantidade integer default 1,
  p_chave_idempotencia uuid default null
)
returns public.loja_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
  v_item public.loja_itens;
  v_saldo integer;
  v_custo integer;
  v_existente public.loja_pedidos;
  v_pedido public.loja_pedidos;
begin
  v_usuario_id := public.usuario_atual_id();
  if v_usuario_id is null then
    raise exception 'USUARIO_NAO_AUTENTICADO';
  end if;
  if p_quantidade is null or p_quantidade <= 0 or p_quantidade > 10 then
    raise exception 'QUANTIDADE_INVALIDA';
  end if;

  -- Uma chave repetida devolve a mesma solicitação sem criar outra.
  if p_chave_idempotencia is not null then
    select p.* into v_existente
    from public.loja_pedidos p
    where p.usuario_id = v_usuario_id
      and p.idempotencia_chave = p_chave_idempotencia
    limit 1;
    if v_existente.id is not null then
      return v_existente;
    end if;
  end if;

  -- Serializa solicitações do mesmo membro para o mesmo item.
  perform pg_advisory_xact_lock(hashtextextended(v_usuario_id::text || ':' || p_item_id::text, 0));

  select p.* into v_existente
  from public.loja_pedidos p
  where p.usuario_id = v_usuario_id
    and p.item_id = p_item_id
    and p.status = 'pendente'
  order by p.solicitado_em desc
  limit 1;

  if v_existente.id is not null then
    raise exception 'PEDIDO_PENDENTE_EXISTENTE';
  end if;

  select i.* into v_item
  from public.loja_itens i
  where i.id = p_item_id
    and i.ativo = true
  for share;

  if v_item.id is null then
    raise exception 'ITEM_INDISPONIVEL';
  end if;
  if v_item.estoque < p_quantidade then
    raise exception 'ESTOQUE_INSUFICIENTE';
  end if;

  v_custo := v_item.preco_kesef * p_quantidade;
  select coalesce(sum(k.quantidade), 0)::integer into v_saldo
  from public.kesef_ledger k
  where k.usuario_id = v_usuario_id;

  if v_saldo < v_custo then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  insert into public.loja_pedidos (
    usuario_id, item_id, quantidade, kesef_debitado, idempotencia_chave
  ) values (
    v_usuario_id, p_item_id, p_quantidade, v_custo, p_chave_idempotencia
  )
  returning * into v_pedido;

  return v_pedido;
end;
$$;

create or replace function public.admin_processar_pedido_loja(
  p_pedido_id uuid,
  p_novo_status text,
  p_observacoes text default null
)
returns public.loja_pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_pedido public.loja_pedidos;
  v_resultado public.loja_pedidos;
begin
  if not public.admin_tem_permissao('store.manage') then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  v_admin_id := public.usuario_atual_id();
  select p.* into v_pedido
  from public.loja_pedidos p
  where p.id = p_pedido_id
  for update;

  if v_pedido.id is null then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;

  if p_novo_status = 'aprovado' then
    if v_pedido.status <> 'pendente' then
      raise exception 'TRANSICAO_INVALIDA';
    end if;

    perform 1 from public.loja_itens i
    where i.id = v_pedido.item_id
    for update;

    update public.loja_itens
    set estoque = estoque - v_pedido.quantidade
    where id = v_pedido.item_id
      and ativo = true
      and estoque >= v_pedido.quantidade;
    if not found then
      raise exception 'ESTOQUE_INSUFICIENTE';
    end if;

    perform public.debitar_kesef(
      v_pedido.usuario_id,
      v_pedido.kesef_debitado,
      v_pedido.id
    );
  elsif p_novo_status = 'rejeitado' then
    if v_pedido.status <> 'pendente' then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
    if nullif(btrim(coalesce(p_observacoes, '')), '') is null then
      raise exception 'MOTIVO_REJEICAO_OBRIGATORIO';
    end if;
  elsif p_novo_status = 'entregue' then
    if v_pedido.status <> 'aprovado' then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
  else
    raise exception 'STATUS_INVALIDO';
  end if;

  update public.loja_pedidos
  set status = p_novo_status,
      observacoes = case
        when p_observacoes is not null then btrim(p_observacoes)
        else observacoes
      end,
      processado_por_admin_id = v_admin_id,
      processado_em = now()
  where id = p_pedido_id
  returning * into v_resultado;

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id,
    before_data, after_data, reason
  ) values (
    v_admin_id, 'store.manage', 'store.order.status_changed',
    'loja_pedidos', p_pedido_id::text,
    to_jsonb(v_pedido), to_jsonb(v_resultado), p_observacoes
  );

  return v_resultado;
end;
$$;

revoke insert on public.loja_pedidos from authenticated;

revoke all on function public.solicitar_resgate_loja(uuid, integer, uuid) from public;
revoke all on function public.admin_processar_pedido_loja(uuid, text, text) from public;
grant execute on function public.solicitar_resgate_loja(uuid, integer, uuid) to authenticated;
grant execute on function public.admin_processar_pedido_loja(uuid, text, text) to authenticated;

comment on column public.loja_pedidos.idempotencia_chave is
  'Chave por membro para tornar a solicitação de resgate idempotente.';
