-- Figurinhas persistentes no chat 1:1, com contrato fechado e compatibilidade
-- com clientes antigos por meio da descrição textual obrigatória.

alter table public.mensagens
  add column if not exists tipo text not null default 'texto',
  add column if not exists figurinha_id text,
  add column if not exists figurinha_pacote text;

alter table public.mensagens
  drop constraint if exists mensagens_tipo_check,
  add constraint mensagens_tipo_check check (tipo in ('texto', 'figurinha')),
  drop constraint if exists mensagens_figurinha_pacote_check,
  add constraint mensagens_figurinha_pacote_check check (
    figurinha_pacote is null or figurinha_pacote in ('essencial', 'vibrante')
  ),
  drop constraint if exists mensagens_figurinha_id_check,
  add constraint mensagens_figurinha_id_check check (
    figurinha_id is null or figurinha_id in (
      'eita-gloria', 'aleluia', 'amem', 'paz-do-senhor',
      'deus-e-fiel', 'estou-orando', 'conte-comigo', 'recebo',
      'fogo-santo', 'renovo', 'avivamento', 'marchando-em-fe',
      'vitoria', 'gloria-a-deus', 'de-joelhos', 'juntos-em-oracao'
    )
  ),
  drop constraint if exists mensagens_conteudo_coerente_check,
  add constraint mensagens_conteudo_coerente_check check (
    (tipo = 'texto' and figurinha_id is null and figurinha_pacote is null)
    or
    (tipo = 'figurinha' and figurinha_id is not null and figurinha_pacote is not null)
  );

create or replace function public.notificar_nova_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remetente_nome text;
  v_resumo text;
begin
  select u.nome into v_remetente_nome
  from public.usuarios u
  where u.id = new.remetente_id;

  v_resumo := case
    when new.tipo = 'figurinha' then '🎉 Enviou uma figurinha: ' || left(new.texto, 80)
    else left(new.texto, 120)
  end;

  insert into public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
  values (
    new.destinatario_id,
    'nova_mensagem',
    'Nova mensagem',
    coalesce(v_remetente_nome, 'Alguém') || ': ' || v_resumo,
    '/chat/' || new.remetente_id::text,
    jsonb_build_object(
      'mensagem_id', new.id,
      'remetente_id', new.remetente_id,
      'conteudo_tipo', new.tipo,
      'tipo', 'nova_mensagem'
    )
  );

  return new;
end;
$$;

comment on column public.mensagens.tipo is 'Tipo de conteúdo: texto ou figurinha.';
comment on column public.mensagens.figurinha_id is 'Identificador fechado do catálogo de figurinhas Comunhão.';
comment on column public.mensagens.figurinha_pacote is 'Variação visual: essencial ou vibrante.';
