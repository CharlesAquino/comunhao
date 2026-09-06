export interface NotificacaoRoteavel {
  id: string;
  tipo: string;
  url?: string | null;
  evento_chave?: string | null;
  dados?: Record<string, unknown>;
}

function obterTexto(
  dados: Record<string, unknown> | undefined,
  ...chaves: string[]
): string | null {
  for (const chave of chaves) {
    const valor = dados?.[chave];
    if (typeof valor === 'string' && valor.trim()) return valor;
  }

  return null;
}

function urlEspecifica(notificacao: NotificacaoRoteavel): string | null {
  const url = notificacao.url?.trim();
  return url && url !== '/' ? url : null;
}

export function obterDestinoNotificacao(
  notificacao: NotificacaoRoteavel,
): string {
  const especifica = urlEspecifica(notificacao);

  if (notificacao.tipo === 'pedido_oracao_acolhido' || notificacao.tipo === 'intercessao_confirmada') {
    return especifica || '/oracao?aba=meus';
  }

  if (notificacao.tipo === 'mao_levantada') {
    const sessaoId = obterTexto(notificacao.dados, 'sessao_id');
    if (sessaoId) return `/?orar_com=${encodeURIComponent(sessaoId)}`;
  }

  if (
    notificacao.tipo === 'mao_aceita' ||
    notificacao.tipo === 'orando_com'
  ) {
    if (especifica) return especifica;

    const sessaoId = obterTexto(notificacao.dados, 'sessao_id');
    if (sessaoId) return `/?orar_com=${encodeURIComponent(sessaoId)}`;
  }

  if (notificacao.tipo === 'convite_oracao') {
    if (especifica) return especifica;

    const conviteId = obterTexto(notificacao.dados, 'convite_id');
    if (conviteId) {
      return `/?convite_oracao=${encodeURIComponent(conviteId)}`;
    }
  }

  if (
    notificacao.tipo === 'convite_aceito' ||
    notificacao.tipo === 'convite_recusado'
  ) {
    if (especifica) return especifica;

    const salaId = obterTexto(notificacao.dados, 'sala_id');
    if (salaId) return `/sala/${encodeURIComponent(salaId)}`;

    const conviteId = obterTexto(notificacao.dados, 'convite_id');
    if (conviteId && notificacao.tipo === 'convite_aceito') {
      return `/timer/${encodeURIComponent(conviteId)}`;
    }

    return '/';
  }

  if (
    notificacao.tipo === 'intercessao_pedido' ||
    notificacao.tipo === 'nova_publicacao_mural' ||
    notificacao.tipo === 'comentario_publicacao' ||
    notificacao.tipo === 'curtida_publicacao'
  ) {
    if (especifica) return especifica;

    const pedidoId = obterTexto(
      notificacao.dados,
      'pedido_id',
      'publicacao_id',
    );

    return pedidoId
      ? `/mural?pedido=${encodeURIComponent(pedidoId)}`
      : '/mural';
  }

  if (notificacao.tipo === 'nova_licao') {
    if (especifica) return especifica;

    const editorialId = obterTexto(
      notificacao.dados,
      'editorial_licao_id',
    );
    if (editorialId) {
      return `/ebd?editorial=${encodeURIComponent(editorialId)}`;
    }

    const licaoId = obterTexto(notificacao.dados, 'licao_id');
    return licaoId ? `/ebd?licao=${encodeURIComponent(licaoId)}` : '/ebd';
  }

  return notificacao.url || '/';
}

export function obterTagNotificacao(
  notificacao: NotificacaoRoteavel,
): string {
  return notificacao.evento_chave || notificacao.id;
}
