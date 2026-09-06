export function mensagemErroConvite(error: unknown): string {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : null;
  const message = error instanceof Error
    ? error.message
    : typeof record?.message === 'string'
      ? record.message
      : typeof record?.details === 'string'
        ? record.details
        : typeof error === 'string'
          ? error
          : '';
  if (message.includes('No API key found')) return 'A conexão com o servidor está sem a chave pública. Atualize a página e tente novamente.';
  if (message.includes('CONVITE_RECEBIDO_PENDENTE')) return 'Sua dupla já enviou um convite. Responda ao convite recebido.';
  if (message.includes('REMETENTE_EM_SALA_ATIVA')) return 'Encerre a sala de oração atual antes de enviar outro convite.';
  if (message.includes('DUPLA_NAO_DEFINIDA') || message.includes('DESTINATARIO_NAO_ENCONTRADO')) return 'Sua dupla de oração ainda não está definida.';
  if (message.includes('CONVITE_PARA_SI_MESMO')) return 'Não é possível enviar um convite para você mesmo.';
  if (message.includes('USUARIO_NAO_ENCONTRADO')) return 'Não foi possível identificar seu perfil. Entre novamente.';
  return message || 'Não foi possível enviar o convite. Tente novamente.';
}
