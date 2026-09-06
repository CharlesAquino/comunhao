import type { PedidoMural, TipoPublicacaoMural } from '../types';

export const MURAL_MAX_COMMENT_LENGTH = 500;
export const MURAL_MAX_IMAGE_BYTES = 1_200_000;
export const MURAL_MAX_SOURCE_BYTES = 15_000_000;
export const MURAL_MAX_IMAGE_WIDTH = 1_440;
export const MURAL_MAX_IMAGE_HEIGHT = 1_800;
export const MURAL_MEDIA_BUCKET = 'mural-media';

export interface MuralMediaRow {
  id: string;
  storage_path: string;
  mime_type: string;
  largura: number;
  altura: number;
  tamanho_bytes: number;
  texto_alternativo: string | null;
}

export function normalizeMuralMediaRelation(
  relation: MuralMediaRow | MuralMediaRow[] | null | undefined,
): MuralMediaRow | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export interface TipoPublicacaoMeta {
  id: TipoPublicacaoMural;
  label: string;
  shortLabel: string;
  emoji: string;
  helper: string;
  tone: 'care' | 'celebration' | 'accent' | 'neutral';
}

export const TIPOS_PUBLICACAO_MURAL: TipoPublicacaoMeta[] = [
  {
    id: 'em_clamor',
    label: 'Pedido de oração',
    shortLabel: 'Pedido',
    emoji: '🙏',
    helper: 'Peça oração e receba cuidado da comunidade.',
    tone: 'care',
  },
  {
    id: 'testemunho',
    label: 'Testemunho',
    shortLabel: 'Testemunho',
    emoji: '🙌',
    helper: 'Compartilhe o que Deus fez na sua jornada.',
    tone: 'celebration',
  },
  {
    id: 'reflexao',
    label: 'Reflexão',
    shortLabel: 'Reflexão',
    emoji: '📖',
    helper: 'Edifique com uma palavra, ensino ou reflexão.',
    tone: 'accent',
  },
  {
    id: 'gratidao',
    label: 'Gratidão',
    shortLabel: 'Gratidão',
    emoji: '🤍',
    helper: 'Expresse gratidão pelas bênçãos recebidas.',
    tone: 'neutral',
  },
];

export function getTipoPublicacaoMeta(tipo: TipoPublicacaoMural): TipoPublicacaoMeta {
  return TIPOS_PUBLICACAO_MURAL.find(item => item.id === tipo) ?? TIPOS_PUBLICACAO_MURAL[0];
}

export function isPedidoSemResposta(pedido: Pick<PedidoMural, 'tipo' | 'contagem' | 'criado_em'>): boolean {
  if (pedido.tipo !== 'em_clamor' || pedido.contagem > 0) return false;

  const criado = new Date(pedido.criado_em).getTime();
  if (!Number.isFinite(criado)) return false;

  const horas = (Date.now() - criado) / 3_600_000;
  return horas >= 0 && horas <= 72;
}

export function priorizarPedidosMural(pedidos: PedidoMural[]): PedidoMural[] {
  return [...pedidos].sort((a, b) => {
    const cuidadoA = isPedidoSemResposta(a) ? 1 : 0;
    const cuidadoB = isPedidoSemResposta(b) ? 1 : 0;

    if (cuidadoA !== cuidadoB) return cuidadoB - cuidadoA;

    return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
  });
}

export function validateMuralImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione uma imagem válida.');
  }

  if (file.size > MURAL_MAX_SOURCE_BYTES) {
    throw new Error('A foto original deve ter no máximo 15 MB.');
  }
}
