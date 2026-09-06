-- PDV da Cantina: solicitação de resgate imediato com confirmação do beneficiário.

create table if not exists public.cantina_resgates (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete restrict,
  operador_id uuid not null references public.usuarios(id) on delete restrict,
  beneficiario_id uuid references public.usuarios(id) on delete restrict,
  codigo text not null unique,
  total_kesef integer not null check (total_kesef > 0),
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'concluido', 'cancelado', 'expirado')),
  expira_em timestamptz not null default (now() + interval '5 minutes'),
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cantina_resgate_itens (
  id uuid primary key default gen_random_uuid(),
  resgate_id uuid not null references public.cantina_resgates(id) on delete cascade,
  anuncio_id uuid not null references public.cantina_anuncios(id) on delete restrict,
  lote_id uuid not null references public.cantina_lotes(id) on delete restrict,
  produto_nome text not null,
  quantidade integer not null check (quantidade > 0),
  valor_unitario_kesef integer not null check (valor_unitario_kesef > 0),
  subtotal_kesef integer not null check (subtotal_kesef > 0)
);

create index if not exists cantina_resgates_evento_idx on public.cantina_resgates(evento_id, status, criado_em desc);
alter table public.cantina_resgates enable row level security;
alter table public.cantina_resgate_itens enable row level security;
create policy cantina_resgates_leitura on public.cantina_resgates for select to authenticated using (
  beneficiario_id = public.usuario_atual_id() or operador_id = public.usuario_atual_id()
  or public.admin_tem_permissao('canteen.checkout.operate')
);
create policy cantina_resgate_itens_leitura on public.cantina_resgate_itens for select to authenticated using (
  exists (select 1 from public.cantina_resgates r where r.id = resgate_id and (
    r.beneficiario_id = public.usuario_atual_id() or r.operador_id = public.usuario_atual_id()
    or public.admin_tem_permissao('canteen.checkout.operate')
  ))
);
grant select on public.cantina_resgates, public.cantina_resgate_itens to authenticated;

create or replace function public.cantina_liberar_resgates_expirados()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_total integer := 0; v_resgate record; v_item record; v_saldo integer;
begin
  for v_resgate in select * from public.cantina_resgates where status = 'aguardando_confirmacao' and expira_em <= now() for update skip locked loop
    for v_item in select * from public.cantina_resgate_itens where resgate_id = v_resgate.id loop
      select quantidade_disponivel into v_saldo from public.cantina_lotes where id = v_item.lote_id for update;
      update public.cantina_lotes set quantidade_disponivel = quantidade_disponivel + v_item.quantidade,
        status = 'confirmado', atualizado_em = now() where id = v_item.lote_id;
      insert into public.cantina_movimentos_estoque(lote_id,tipo,quantidade,saldo_anterior,saldo_posterior,responsavel_id,motivo)
      values(v_item.lote_id,'liberacao',v_item.quantidade,v_saldo,v_saldo+v_item.quantidade,v_resgate.operador_id,'Expiração da solicitação de resgate imediato');
    end loop;
    update public.cantina_resgates set status='expirado', atualizado_em=now() where id=v_resgate.id;
    v_total := v_total + 1;
  end loop;
  return v_total;
end; $$;

create or replace function public.cantina_criar_resgate_imediato(p_evento_id uuid, p_itens jsonb)
returns public.cantina_resgates language plpgsql security definer set search_path = '' as $$
declare v_operador uuid := public.usuario_atual_id(); v_evento public.cantina_eventos; v_row jsonb;
  v_anuncio public.cantina_anuncios; v_lote public.cantina_lotes; v_qtd integer; v_total integer := 0;
  v_resgate public.cantina_resgates;
begin
  if v_operador is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if not public.admin_tem_permissao('canteen.checkout.operate') then raise exception 'PERMISSAO_NEGADA'; end if;
  perform public.cantina_liberar_resgates_expirados();
  select * into v_evento from public.cantina_eventos where id=p_evento_id for share;
  if v_evento.id is null or v_evento.status not in ('aberto','anunciado','reservas_encerradas')
    or now() < v_evento.inicio_em - interval '2 hours' or now() > v_evento.fim_em then raise exception 'EVENTO_FORA_DA_OPERACAO'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens)=0 then raise exception 'CARRINHO_VAZIO'; end if;

  insert into public.cantina_resgates(evento_id,operador_id,codigo,total_kesef)
  values(p_evento_id,v_operador,upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),1) returning * into v_resgate;
  for v_row in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_row->>'quantidade')::integer;
    if v_qtd < 1 or v_qtd > 20 then raise exception 'QUANTIDADE_INVALIDA'; end if;
    select * into v_anuncio from public.cantina_anuncios where id=(v_row->>'anuncio_id')::uuid and evento_id=p_evento_id and status='publicado' for share;
    if v_anuncio.id is null then raise exception 'ANUNCIO_INDISPONIVEL'; end if;
    select * into v_lote from public.cantina_lotes where id=v_anuncio.lote_id for update;
    if v_lote.quantidade_disponivel < v_qtd then raise exception 'ESTOQUE_INSUFICIENTE'; end if;
    update public.cantina_lotes set quantidade_disponivel=quantidade_disponivel-v_qtd,
      status=case when quantidade_disponivel-v_qtd=0 then 'esgotado' else status end, atualizado_em=now() where id=v_lote.id;
    insert into public.cantina_resgate_itens(resgate_id,anuncio_id,lote_id,produto_nome,quantidade,valor_unitario_kesef,subtotal_kesef)
    select v_resgate.id,v_anuncio.id,v_lote.id,p.nome,v_qtd,v_anuncio.valor_kesef,v_qtd*v_anuncio.valor_kesef from public.cantina_produtos p where p.id=v_anuncio.produto_id;
    insert into public.cantina_movimentos_estoque(lote_id,tipo,quantidade,saldo_anterior,saldo_posterior,responsavel_id,motivo)
    values(v_lote.id,'reserva',-v_qtd,v_lote.quantidade_disponivel,v_lote.quantidade_disponivel-v_qtd,v_operador,'Bloqueio do carrinho no resgate imediato');
    v_total := v_total + v_qtd*v_anuncio.valor_kesef;
  end loop;
  update public.cantina_resgates set total_kesef=v_total where id=v_resgate.id returning * into v_resgate;
  return v_resgate;
end; $$;

create or replace function public.cantina_consultar_resgate_imediato(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_resgate public.cantina_resgates; v_saldo integer;
begin
  if public.usuario_atual_id() is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  perform public.cantina_liberar_resgates_expirados();
  select * into v_resgate from public.cantina_resgates where codigo=upper(btrim(p_codigo)) and status='aguardando_confirmacao';
  if v_resgate.id is null then raise exception 'SOLICITACAO_NAO_ENCONTRADA'; end if;
  select coalesce(sum(quantidade),0)::integer into v_saldo from public.kesef_ledger where usuario_id=public.usuario_atual_id();
  return jsonb_build_object('id',v_resgate.id,'codigo',v_resgate.codigo,'total_kesef',v_resgate.total_kesef,'expira_em',v_resgate.expira_em,
    'saldo',v_saldo,'evento',(select nome from public.cantina_eventos where id=v_resgate.evento_id),
    'itens',(select jsonb_agg(jsonb_build_object('nome',produto_nome,'quantidade',quantidade,'subtotal_kesef',subtotal_kesef)) from public.cantina_resgate_itens where resgate_id=v_resgate.id));
end; $$;

create or replace function public.cantina_confirmar_resgate_imediato(p_resgate_id uuid, p_codigo text)
returns public.cantina_resgates language plpgsql security definer set search_path = '' as $$
declare v_usuario uuid:=public.usuario_atual_id(); v_resgate public.cantina_resgates; v_saldo integer;
begin
  if v_usuario is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  select * into v_resgate from public.cantina_resgates where id=p_resgate_id for update;
  if v_resgate.id is null or v_resgate.codigo<>upper(btrim(p_codigo)) then raise exception 'CODIGO_INVALIDO'; end if;
  if v_resgate.status<>'aguardando_confirmacao' then raise exception 'SOLICITACAO_JA_PROCESSADA'; end if;
  if v_resgate.expira_em<=now() then perform public.cantina_liberar_resgates_expirados(); raise exception 'SOLICITACAO_EXPIRADA'; end if;
  perform 1 from public.usuarios where id=v_usuario for update;
  select coalesce(sum(quantidade),0)::integer into v_saldo from public.kesef_ledger where usuario_id=v_usuario;
  if v_saldo<v_resgate.total_kesef then raise exception 'SALDO_INSUFICIENTE'; end if;
  insert into public.kesef_ledger(usuario_id,tipo,quantidade,referencia_id) values(v_usuario,'resgate',-v_resgate.total_kesef,v_resgate.id);
  update public.cantina_resgates set beneficiario_id=v_usuario,status='concluido',confirmado_em=now(),atualizado_em=now() where id=v_resgate.id returning * into v_resgate;
  return v_resgate;
end; $$;

create or replace function public.cantina_cancelar_resgate_imediato(p_resgate_id uuid)
returns public.cantina_resgates language plpgsql security definer set search_path = '' as $$
declare v_operador uuid:=public.usuario_atual_id(); v_resgate public.cantina_resgates; v_item record; v_saldo integer;
begin
  if v_operador is null or not public.admin_tem_permissao('canteen.checkout.operate') then raise exception 'PERMISSAO_NEGADA'; end if;
  select * into v_resgate from public.cantina_resgates where id=p_resgate_id for update;
  if v_resgate.id is null or v_resgate.operador_id<>v_operador then raise exception 'SOLICITACAO_NAO_ENCONTRADA'; end if;
  if v_resgate.status<>'aguardando_confirmacao' then raise exception 'SOLICITACAO_JA_PROCESSADA'; end if;
  for v_item in select * from public.cantina_resgate_itens where resgate_id=v_resgate.id loop
    select quantidade_disponivel into v_saldo from public.cantina_lotes where id=v_item.lote_id for update;
    update public.cantina_lotes set quantidade_disponivel=quantidade_disponivel+v_item.quantidade,status='confirmado',atualizado_em=now() where id=v_item.lote_id;
    insert into public.cantina_movimentos_estoque(lote_id,tipo,quantidade,saldo_anterior,saldo_posterior,responsavel_id,motivo)
    values(v_item.lote_id,'liberacao',v_item.quantidade,v_saldo,v_saldo+v_item.quantidade,v_operador,'Cancelamento do resgate imediato pelo operador');
  end loop;
  update public.cantina_resgates set status='cancelado',atualizado_em=now() where id=v_resgate.id returning * into v_resgate;
  return v_resgate;
end; $$;

revoke all on function public.cantina_liberar_resgates_expirados() from public,anon;
grant execute on function public.cantina_liberar_resgates_expirados() to authenticated;
revoke all on function public.cantina_criar_resgate_imediato(uuid,jsonb) from public,anon;
grant execute on function public.cantina_criar_resgate_imediato(uuid,jsonb) to authenticated;
revoke all on function public.cantina_consultar_resgate_imediato(text) from public,anon;
grant execute on function public.cantina_consultar_resgate_imediato(text) to authenticated;
revoke all on function public.cantina_confirmar_resgate_imediato(uuid,text) from public,anon;
grant execute on function public.cantina_confirmar_resgate_imediato(uuid,text) to authenticated;
revoke all on function public.cantina_cancelar_resgate_imediato(uuid) from public,anon;
grant execute on function public.cantina_cancelar_resgate_imediato(uuid) to authenticated;
