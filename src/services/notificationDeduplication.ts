export interface NotificacaoDeduplicavel {
  id: string;
  evento_chave?: string | null;
  lida?: boolean;
  criada_em?: string;
}

export function obterIdentificadoresNotificacao(
  notificacao: NotificacaoDeduplicavel,
): string[] {
  const identificadores = [`id:${notificacao.id}`];
  const eventoChave = notificacao.evento_chave?.trim();

  if (eventoChave) {
    identificadores.push(`evento:${eventoChave}`);
  }

  return identificadores;
}

export function notificacaoJaExiste(
  notificacoes: readonly NotificacaoDeduplicavel[],
  candidata: NotificacaoDeduplicavel,
): boolean {
  const identificadoresCandidata = new Set(obterIdentificadoresNotificacao(candidata));

  return notificacoes.some(notificacao =>
    obterIdentificadoresNotificacao(notificacao)
      .some(identificador => identificadoresCandidata.has(identificador)),
  );
}

export function deduplicarNotificacoes<T extends NotificacaoDeduplicavel>(
  notificacoes: readonly T[],
): T[] {
  const identificadoresConhecidos = new Set<string>();
  const resultado: T[] = [];

  for (const notificacao of notificacoes) {
    const identificadores = obterIdentificadoresNotificacao(notificacao);
    if (identificadores.some(identificador => identificadoresConhecidos.has(identificador))) {
      continue;
    }

    identificadores.forEach(identificador => identificadoresConhecidos.add(identificador));
    resultado.push(notificacao);
  }

  return resultado;
}

export function ordenarNotificacoesMaisRecentes<T extends NotificacaoDeduplicavel>(
  notificacoes: readonly T[],
): T[] {
  return [...notificacoes].sort((a, b) => {
    const dataA = a.criada_em ? new Date(a.criada_em).getTime() : 0;
    const dataB = b.criada_em ? new Date(b.criada_em).getTime() : 0;
    return dataB - dataA;
  });
}

export function mesclarNotificacaoUnica<T extends NotificacaoDeduplicavel>(
  atuais: readonly T[],
  nova: T,
  limite = 30,
): { notificacoes: T[]; adicionada: boolean } {
  const adicionada = !notificacaoJaExiste(atuais, nova);
  const notificacoes = ordenarNotificacoesMaisRecentes(
    deduplicarNotificacoes([nova, ...atuais]),
  ).slice(0, limite);

  return { notificacoes, adicionada };
}

export function contarNotificacoesUnicasNaoLidas(
  notificacoes: readonly NotificacaoDeduplicavel[],
): number {
  return deduplicarNotificacoes(notificacoes)
    .filter(notificacao => notificacao.lida === false)
    .length;
}
