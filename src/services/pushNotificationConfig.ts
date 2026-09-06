export const PUSH_CHANNELS = {
  MENSAGENS: 'mensagens',
  ORACAO: 'oracao',
  AVISOS: 'avisos',
} as const;

export type PushChannelId = typeof PUSH_CHANNELS[keyof typeof PUSH_CHANNELS];

const TIPOS_ORACAO = new Set([
  'convite_oracao',
  'convite_aceito',
  'convite_recusado',
  'mao_levantada',
  'mao_aceita',
  'orando_com',
  'pedido_oracao_acolhido',
  'intercessao_confirmada',
]);

export function obterCanalPush(tipo: string): PushChannelId {
  if (tipo === 'nova_mensagem') return PUSH_CHANNELS.MENSAGENS;
  if (TIPOS_ORACAO.has(tipo)) return PUSH_CHANNELS.ORACAO;
  return PUSH_CHANNELS.AVISOS;
}

export function obterRotaPush(dados: Record<string, unknown> | undefined): string {
  const url = dados?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : '/';
}

export function obterIdNotificacaoPush(dados: Record<string, unknown> | undefined): string | null {
  const id = dados?.notification_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
