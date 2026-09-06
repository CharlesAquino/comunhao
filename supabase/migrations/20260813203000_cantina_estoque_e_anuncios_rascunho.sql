-- Cantina, fase 2: produtos internos, contribuições, lotes e anúncios em rascunho.
-- Nenhum anúncio desta fase pode ficar público ou aceitar resgate.

create table if not exists public.cantina_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 100),
  descricao text not null default '' check (char_length(descricao) <= 500),
  unidade text not null default 'unidade'
    check (unidade in ('unidade', 'porcao', 'fatia', 'copo', 'kit', 'outro')),
  alergenicos text[] not null default '{}',
  imagem_url text,
  reutilizavel boolean not null default true,
  ativo boolean not null default true,
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cantina_contribuicoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete cascade,
  contribuidor_id uuid references public.usuarios(id) on delete set null,
  origem text not null check (origem in ('doacao', 'contribuicao_pessoal', 'compra_comunitaria', 'despesa_autorizada', 'outra')),
  declaracao_versao text not null default 'cantina-contribuicao-v1',
  observacao_privada text check (char_length(observacao_privada) <= 1000),
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now()
);

create table if not exists public.cantina_lotes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete cascade,
  produto_id uuid not null references public.cantina_produtos(id) on delete restrict,
  contribuicao_id uuid references public.cantina_contribuicoes(id) on delete set null,
  quantidade_recebida integer not null check (quantidade_recebida > 0),
  quantidade_disponivel integer not null check (quantidade_disponivel >= 0),
  validade_em timestamptz,
  conservacao text check (char_length(conservacao) <= 500),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'confirmado', 'bloqueado', 'esgotado', 'encerrado')),
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cantina_lote_disponivel_valido check (quantidade_disponivel <= quantidade_recebida)
);

create table if not exists public.cantina_anuncios (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.cantina_eventos(id) on delete cascade,
  produto_id uuid not null references public.cantina_produtos(id) on delete restrict,
  lote_id uuid not null references public.cantina_lotes(id) on delete restrict,
  valor_kesef integer check (valor_kesef > 0),
  limite_por_membro integer not null default 1 check (limite_por_membro between 1 and 20),
  quantidade_reservavel integer not null default 0 check (quantidade_reservavel >= 0),
  ordem integer not null default 0,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'pronto_para_revisao', 'publicado', 'pausado', 'encerrado')),
  disponivel_de timestamptz,
  disponivel_ate timestamptz,
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (evento_id, lote_id),
  constraint cantina_anuncio_periodo_valido check (
    disponivel_de is null or disponivel_ate is null or disponivel_ate > disponivel_de
  ),
  constraint cantina_anuncio_publicacao_com_valor check (
    status not in ('publicado', 'pausado', 'encerrado') or valor_kesef is not null
  )
);

create table if not exists public.cantina_movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.cantina_lotes(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'ajuste_positivo', 'ajuste_negativo', 'reserva', 'liberacao', 'resgate', 'sobra', 'descarte')),
  quantidade integer not null check (quantidade <> 0),
  saldo_anterior integer not null,
  saldo_posterior integer not null,
  responsavel_id uuid not null references public.usuarios(id) on delete restrict,
  motivo text not null check (char_length(btrim(motivo)) >= 5),
  criado_em timestamptz not null default now()
);

create index if not exists cantina_lotes_evento_idx on public.cantina_lotes(evento_id, status);
create index if not exists cantina_anuncios_evento_idx on public.cantina_anuncios(evento_id, status, ordem);
create index if not exists cantina_contribuicoes_evento_idx on public.cantina_contribuicoes(evento_id, criado_em desc);

alter table public.cantina_produtos enable row level security;
alter table public.cantina_contribuicoes enable row level security;
alter table public.cantina_lotes enable row level security;
alter table public.cantina_anuncios enable row level security;
alter table public.cantina_movimentos_estoque enable row level security;

create policy cantina_produtos_leitura on public.cantina_produtos
for select to authenticated using (ativo or public.admin_tem_permissao('canteen.inventory.manage'));
create policy cantina_contribuicoes_leitura on public.cantina_contribuicoes
for select to authenticated using (
  contribuidor_id = public.usuario_atual_id()
  or public.admin_tem_permissao('canteen.inventory.manage')
);
create policy cantina_lotes_leitura on public.cantina_lotes
for select to authenticated using (public.admin_tem_permissao('canteen.inventory.manage'));
create policy cantina_anuncios_leitura on public.cantina_anuncios
for select to authenticated using (
  public.admin_tem_permissao('canteen.read')
  or (
    status = 'publicado' and disponivel_de <= now() and disponivel_ate > now()
    and exists (
      select 1 from public.cantina_eventos e
      where e.id = evento_id
        and e.status in ('anunciado', 'reservas_abertas', 'reservas_encerradas', 'aberto', 'pausado')
        and e.fim_em > now()
    )
  )
);
create policy cantina_movimentos_leitura on public.cantina_movimentos_estoque
for select to authenticated using (public.admin_tem_permissao('canteen.inventory.manage'));

create or replace function public.cantina_registrar_lote(
  p_evento_id uuid,
  p_produto_nome text,
  p_descricao text,
  p_unidade text,
  p_alergenicos text[],
  p_imagem_url text,
  p_origem text,
  p_quantidade integer,
  p_valor_kesef integer,
  p_limite_por_membro integer default 1,
  p_quantidade_reservavel integer default 0,
  p_validade_em timestamptz default null,
  p_conservacao text default null,
  p_observacao_privada text default null
)
returns public.cantina_lotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_evento public.cantina_eventos;
  v_produto public.cantina_produtos;
  v_contribuicao public.cantina_contribuicoes;
  v_lote public.cantina_lotes;
begin
  if v_usuario_id is null then raise exception 'USUARIO_NAO_AUTENTICADO'; end if;
  if not public.admin_tem_permissao('canteen.inventory.manage') then raise exception 'PERMISSAO_NEGADA'; end if;
  if p_quantidade is null or p_quantidade <= 0 then raise exception 'QUANTIDADE_INVALIDA'; end if;
  if p_valor_kesef is null or p_valor_kesef <= 0 then raise exception 'VALOR_KESEF_INVALIDO'; end if;
  if p_limite_por_membro < 1 or p_limite_por_membro > 20 then raise exception 'LIMITE_INVALIDO'; end if;
  if p_quantidade_reservavel < 0 or p_quantidade_reservavel > p_quantidade then raise exception 'QUANTIDADE_RESERVAVEL_INVALIDA'; end if;

  select * into v_evento from public.cantina_eventos where id = p_evento_id for share;
  if v_evento.id is null then raise exception 'EVENTO_NAO_ENCONTRADO'; end if;
  if v_evento.status not in ('rascunho', 'anunciado', 'reservas_abertas') then raise exception 'EVENTO_NAO_EDITAVEL'; end if;

  select * into v_produto
  from public.cantina_produtos
  where lower(nome) = lower(btrim(p_produto_nome)) and unidade = p_unidade and ativo = true
  order by criado_em limit 1;

  if v_produto.id is null then
    insert into public.cantina_produtos (nome, descricao, unidade, alergenicos, imagem_url, criado_por)
    values (btrim(p_produto_nome), coalesce(btrim(p_descricao), ''), p_unidade, coalesce(p_alergenicos, '{}'), nullif(btrim(p_imagem_url), ''), v_usuario_id)
    returning * into v_produto;
  else
    update public.cantina_produtos
       set descricao = coalesce(nullif(btrim(p_descricao), ''), descricao),
           alergenicos = coalesce(p_alergenicos, alergenicos),
           imagem_url = coalesce(nullif(btrim(p_imagem_url), ''), imagem_url),
           atualizado_em = now()
     where id = v_produto.id
     returning * into v_produto;
  end if;

  insert into public.cantina_contribuicoes (
    evento_id, contribuidor_id, origem, observacao_privada, registrado_por
  ) values (
    p_evento_id,
    case when p_origem in ('doacao', 'contribuicao_pessoal') then v_usuario_id else null end,
    p_origem, nullif(btrim(p_observacao_privada), ''), v_usuario_id
  ) returning * into v_contribuicao;

  insert into public.cantina_lotes (
    evento_id, produto_id, contribuicao_id, quantidade_recebida,
    quantidade_disponivel, validade_em, conservacao, status, criado_por
  ) values (
    p_evento_id, v_produto.id, v_contribuicao.id, p_quantidade,
    p_quantidade, p_validade_em, nullif(btrim(p_conservacao), ''), 'confirmado', v_usuario_id
  ) returning * into v_lote;

  insert into public.cantina_movimentos_estoque (
    lote_id, tipo, quantidade, saldo_anterior, saldo_posterior, responsavel_id, motivo
  ) values (v_lote.id, 'entrada', p_quantidade, 0, p_quantidade, v_usuario_id, 'Entrada inicial do lote');

  insert into public.cantina_anuncios (
    evento_id, produto_id, lote_id, valor_kesef, limite_por_membro,
    quantidade_reservavel, status, disponivel_de, disponivel_ate, criado_por
  ) values (
    p_evento_id, v_produto.id, v_lote.id, p_valor_kesef, p_limite_por_membro,
    p_quantidade_reservavel, 'rascunho',
    coalesce(v_evento.reservas_abrem_em, v_evento.inicio_em), v_evento.fim_em, v_usuario_id
  );

  insert into public.admin_audit_log (
    actor_user_id, permission, action, entity_type, entity_id, after_data, reason
  ) values (
    v_usuario_id, 'canteen.inventory.manage', 'create_lot', 'cantina_lote', v_lote.id::text,
    jsonb_build_object('evento_id', p_evento_id, 'produto_id', v_produto.id, 'quantidade', p_quantidade, 'origem', p_origem, 'valor_kesef', p_valor_kesef),
    'Registro de entrada de estoque da Cantina'
  );
  return v_lote;
end;
$$;

create or replace function public.cantina_listar_estoque_evento(p_evento_id uuid)
returns table (
  lote_id uuid, produto_id uuid, produto_nome text, descricao text, unidade text,
  alergenicos text[], imagem_url text, quantidade_recebida integer, quantidade_disponivel integer,
  validade_em timestamptz, conservacao text, origem text, anuncio_id uuid,
  anuncio_status text, valor_kesef integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, p.id, p.nome, p.descricao, p.unidade, p.alergenicos, p.imagem_url,
         l.quantidade_recebida, l.quantidade_disponivel, l.validade_em, l.conservacao,
         c.origem, a.id, a.status, a.valor_kesef
  from public.cantina_lotes l
  join public.cantina_produtos p on p.id = l.produto_id
  left join public.cantina_contribuicoes c on c.id = l.contribuicao_id
  left join public.cantina_anuncios a on a.lote_id = l.id
  where l.evento_id = p_evento_id
    and public.admin_tem_permissao('canteen.inventory.manage')
  order by l.criado_em desc;
$$;

revoke all on function public.cantina_registrar_lote(uuid, text, text, text, text[], text, text, integer, integer, integer, integer, timestamptz, text, text) from public, anon;
grant execute on function public.cantina_registrar_lote(uuid, text, text, text, text[], text, text, integer, integer, integer, integer, timestamptz, text, text) to authenticated;
revoke all on function public.cantina_listar_estoque_evento(uuid) from public, anon;
grant execute on function public.cantina_listar_estoque_evento(uuid) to authenticated;

grant select on public.cantina_produtos, public.cantina_contribuicoes,
  public.cantina_lotes, public.cantina_anuncios, public.cantina_movimentos_estoque
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cantina-produtos', 'cantina-produtos', true, 1572864, array['image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy cantina_produtos_imagem_publica on storage.objects
for select to public using (bucket_id = 'cantina-produtos');
create policy cantina_produtos_imagem_inserir on storage.objects
for insert to authenticated with check (
  bucket_id = 'cantina-produtos' and (storage.foldername(name))[1] = auth.uid()::text
  and public.admin_tem_permissao('canteen.inventory.manage')
);
create policy cantina_produtos_imagem_remover on storage.objects
for delete to authenticated using (
  bucket_id = 'cantina-produtos' and public.admin_tem_permissao('canteen.inventory.manage')
);
