type EditorialDatabaseError = {
  code?: string;
  message?: string;
  details?: string;
};

export function editorialPublicationError(error: unknown): Error {
  const candidate = error as EditorialDatabaseError | null;
  const token = `${candidate?.message ?? ''} ${candidate?.details ?? ''}`;

  if (candidate?.code === '40001' || token.includes('EBD_VERSION_CONFLICT')) {
    return new Error('A lição foi atualizada em outra operação. Recarregue o Estúdio e tente novamente.');
  }
  if (token.includes('EBD_DAY_INCOMPLETE')) {
    return new Error('O dia precisa ter título e pelo menos um bloco antes da publicação.');
  }
  if (token.includes('EBD_DAY_NOT_FOUND')) {
    return new Error('O dia selecionado não pertence à versão atual da lição. Recarregue o Estúdio.');
  }
  if (token.includes('EBD_RELEASED_DAY_IMMUTABLE')) {
    return new Error('Este dia já foi liberado e não pode ser alterado diretamente. Crie uma nova revisão editorial.');
  }
  if (token.includes('EBD_DOCUMENT_INVALID')) {
    return new Error('A estrutura da lição está inválida. Confira se os sete dias e seus blocos estão preenchidos corretamente.');
  }
  if (token.includes('EBD_PUBLISH_PERMISSION_REQUIRED') || token.includes('EBD_MANAGE_PERMISSION_REQUIRED')) {
    return new Error('Seu perfil não possui permissão para publicar lições.');
  }

  return error instanceof Error ? error : new Error('Não foi possível publicar este dia agora.');
}
