-- Reserva antecipada: aprovisiona Kesef e estoque de modo atômico e idempotente.

create table if not exists public.cantina_reservas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete restrict,
  anuncio_id uuid not null references public.cantina_anuncios(id) on delete restrict,
  lote_id uuid not null references public.cantina_lotes(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  valor_unitario_kesef integer not null check (valor_unitario_kesef > 0),
  kesef_aprovisionado integer not null check (kesef_aprovisionado > 0),
  status text not null default 'reservada'
    check (status in ('reservada', 'retirada', 'cancelada', 'nao_compareceu', 'doada')),
  codigo_retirada text not null,
  idempotencia_chave uuid,
  reservada_em timestamptz not null default now(),
  cancelada_em timestamptz,
  retirada_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (codigo_retirada)
);

create unique index if not exists cantina_reservas_usuario_idempotencia_idx
  on public.cantina_reservas(usuario_id, idempotencia_chave)
  where idempotencia_chave is not null;
create index if not exists cantina_reservas_usuario_idx
  on public.cantina_reservas(usuario_id, reservada_em desc);
create index if not exists cantina_reservas_anuncio_ativas_idx
  on public.cantina_reservas(anuncio_id, status)
  where status = 'reservada';

alter table public.cantina_reservas enable row level security;
create policy cantina_reservas_leitura on public.cantina_reservas
for select to authenticated using (
  usuario_id = public.usuario_atual_id()
  or public.admin_tem_permissao('canteen.redemptions.read')
);
grant select on public.cantina_reservas to authenticated;

create or replace function public.cantina_reservar(
  p_anuncio_id uuid,
  p_quantidade integer default 1,
  p_chave_idempotencia uuid default null
)
returns public.cantina_reservas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_anuncio public.cantina_anuncios;
  v_evento public.cantina_eventos;
  v_lote public.cantina_lotes;
  v_reserva public.cantina_reservas;
  v_saldo integer;
  v_total_usuario integer;
  v_total_reservado integer;
  v_custo integer;
begin
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'QUANTIDADE_INVALIDA'; end if;

  if p_chave_idempotencia is not null then
    select * into v_reserva from public.cantina_reservas
    where usuario_id = v_usuario_id and idempotencia_chave = p_chave_idempotencia;
    if v_reserva.id is not null then return v_reserva; end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_usuario_id::text || ':' || p_anuncio_id::text, 0));

  select * into v_anuncio from public.cantina_anuncios
  where id = p_anuncio_id and status = 'publicado' for update;
  if v_anuncio.id is null then raise exception 'ANUNCIO_INDISPONIVEL'; end if;

  select * into v_evento from public.cantina_eventos where id = v_anuncio.evento_id for share;
  if v_evento.status not in ('anunciado', 'reservas_abertas')
     or v_evento.reservas_abrem_em is null or now() < v_evento.reservas_abrem_em
     or (v_evento.reservas_fecham_em is not null and now() >= v_evento.reservas_fecham_em) then
    raise exception 'RESERVAS_FECHADAS';
  end if;

  select * into v_lote from public.cantina_lotes where id = v_anuncio.lote_id for update;
  if v_lote.status <> 'confirmado' or v_lote.quantidade_disponivel < p_quantidade then
    raise exception 'ESTOQUE_INSUFICIENTE';
  end if;

  select coalesce(sum(r.quantidade), 0)::integer into v_total_usuario
  from public.cantina_reservas r
  where r.usuario_id = v_usuario_id and r.anuncio_id = p_anuncio_id
    and r.status in ('reservada', 'retirada', 'nao_compareceu', 'doada');
  if v_total_usuario + p_quantidade > v_anuncio.limite_por_membro then
    raise exception 'LIMITE_POR_MEMBRO_ATINGIDO';
  end if;

  select coalesce(sum(r.quantidade), 0)::integer into v_total_reservado
  from public.cantina_reservas r
  where r.anuncio_id = p_anuncio_id and r.status = 'reservada';
  if v_total_reservado + p_quantidade > v_anuncio.quantidade_reservavel then
    raise exception 'COTA_DE_RESERVA_ESGOTADA';
  end if;

  perform 1 from public.usuarios where id = v_usuario_id for update;
  select coalesce(sum(k.quantidade), 0)::integer into v_saldo
  from public.kesef_ledger k where k.usuario_id = v_usuario_id;
  v_custo := v_anuncio.valor_kesef * p_quantidade;
  if v_saldo < v_custo then raise exception 'SALDO_INSUFICIENTE'; end if;

  insert into public.cantina_reservas (
    evento_id, anuncio_id, lote_id, usuario_id, quantidade,
    valor_unitario_kesef, kesef_aprovisionado, codigo_retirada, idempotencia_chave
  ) values (
    v_evento.id, v_anuncio.id, v_lote.id, v_usuario_id, p_quantidade,
    v_anuncio.valor_kesef, v_custo,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), p_chave_idempotencia
  ) returning * into v_reserva;

  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (v_usuario_id, 'resgate', -v_custo, v_reserva.id);

  update public.cantina_lotes set
    quantidade_disponivel = quantidade_disponivel - p_quantidade,
    status = case when quantidade_disponivel - p_quantidade = 0 then 'esgotado' else status end,
    atualizado_em = now()
  where id = v_lote.id;

  insert into public.cantina_movimentos_estoque (
    lote_id, tipo, quantidade, saldo_anterior, saldo_posterior, responsavel_id, motivo
  ) values (
    v_lote.id, 'reserva', -p_quantidade, v_lote.quantidade_disponivel,
    v_lote.quantidade_disponivel - p_quantidade, v_usuario_id, 'Reserva antecipada da Cantina'
  );
  return v_reserva;
end;
$$;

create or replace function public.cantina_cancelar_reserva(p_reserva_id uuid)
returns public.cantina_reservas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_reserva public.cantina_reservas;
  v_evento public.cantina_eventos;
  v_saldo_anterior integer;
begin
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  select * into v_reserva from public.cantina_reservas where id = p_reserva_id for update;
  if v_reserva.id is null or v_reserva.usuario_id <> v_usuario_id then raise exception 'RESERVA_NAO_ENCONTRADA'; end if;
  if v_reserva.status <> 'reservada' then raise exception 'RESERVA_NAO_CANCELAVEL'; end if;
  select * into v_evento from public.cantina_eventos where id = v_reserva.evento_id;
  if v_evento.cancelamento_ate is null or now() >= v_evento.cancelamento_ate then raise exception 'PRAZO_CANCELAMENTO_ENCERRADO'; end if;

  select quantidade_disponivel into v_saldo_anterior from public.cantina_lotes where id = v_reserva.lote_id for update;
  update public.cantina_lotes set quantidade_disponivel = quantidade_disponivel + v_reserva.quantidade,
    status = 'confirmado', atualizado_em = now() where id = v_reserva.lote_id;
  insert into public.cantina_movimentos_estoque (
    lote_id, tipo, quantidade, saldo_anterior, saldo_posterior, responsavel_id, motivo
  ) values (v_reserva.lote_id, 'liberacao', v_reserva.quantidade, v_saldo_anterior,
    v_saldo_anterior + v_reserva.quantidade, v_usuario_id, 'Cancelamento no prazo da reserva');
  insert into public.kesef_ledger (usuario_id, tipo, quantidade, referencia_id)
  values (v_usuario_id, 'estorno', v_reserva.kesef_aprovisionado, v_reserva.id);
  update public.cantina_reservas set status = 'cancelada', cancelada_em = now(), atualizado_em = now()
  where id = v_reserva.id returning * into v_reserva;
  return v_reserva;
end;
$$;

create or replace function public.cantina_minhas_reservas()
returns table (
  id uuid, evento_id uuid, anuncio_id uuid, evento_nome text, evento_local text,
  inicio_em timestamptz, fim_em timestamptz, cancelamento_ate timestamptz,
  produto_nome text, imagem_url text, quantidade integer, valor_unitario_kesef integer,
  kesef_aprovisionado integer, status text, codigo_retirada text, reservada_em timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.evento_id, r.anuncio_id, e.nome, e.local, e.inicio_em, e.fim_em,
    e.cancelamento_ate, p.nome, p.imagem_url, r.quantidade, r.valor_unitario_kesef,
    r.kesef_aprovisionado, r.status, r.codigo_retirada, r.reservada_em
  from public.cantina_reservas r
  join public.cantina_eventos e on e.id = r.evento_id
  join public.cantina_anuncios a on a.id = r.anuncio_id
  join public.cantina_produtos p on p.id = a.produto_id
  where auth.uid() is not null and r.usuario_id = public.usuario_atual_id()
  order by r.reservada_em desc;
$$;

revoke all on function public.cantina_reservar(uuid, integer, uuid) from public, anon;
grant execute on function public.cantina_reservar(uuid, integer, uuid) to authenticated;
revoke all on function public.cantina_cancelar_reserva(uuid) from public, anon;
grant execute on function public.cantina_cancelar_reserva(uuid) to authenticated;
revoke all on function public.cantina_minhas_reservas() from public, anon;
grant execute on function public.cantina_minhas_reservas() to authenticated;

