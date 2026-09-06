export interface AtualizacaoConviteRoteavel {
  id: string;
  status: string;
  sala_id?: string | null;
}

/**
 * Define para onde os dois participantes devem ir quando um convite é aceito.
 * Convites com sala de voz/vídeo usam /sala/:salaId; o modo simples usa o timer.
 */
export function obterDestinoConviteAceito(
  convite: AtualizacaoConviteRoteavel,
): string | null {
  if (convite.status !== 'aceito') return null;

  if (convite.sala_id) {
    return `/sala/${encodeURIComponent(convite.sala_id)}`;
  }

  return `/timer/${encodeURIComponent(convite.id)}`;
}

export function obterModoConviteAceito(convite: {
  tipo_conexao_remetente?: string | null;
  tipo_conexao_destinatario?: string | null;
}): 'voz' | 'video' | 'silencio' {
  if (convite.tipo_conexao_remetente === 'video' || convite.tipo_conexao_destinatario === 'video') return 'video';
  if (convite.tipo_conexao_remetente === 'voz' || convite.tipo_conexao_destinatario === 'voz') return 'voz';
  return 'silencio';
}

export function deveEncaminharAceiteNovo(
  statusAnterior: string | null,
  statusAtual: string | null,
  recebidoEmTempoReal = false,
): boolean {
  if (statusAtual !== 'aceito') return false;
  return recebidoEmTempoReal || statusAnterior === 'pendente';
}
