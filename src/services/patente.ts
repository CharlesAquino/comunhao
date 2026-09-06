import type { BadgeRankName } from '../assets/badges/badgeTokens';

export type PatenteId = BadgeRankName;

export type Esfera = 1 | 2 | 3;
export type Divisao = 1 | 2 | 3 | 4;

export interface Patente {
  id: PatenteId;
  nome: string;
  descricao: string;
  xpMin: number;
  esfera: Esfera;
  esferaNome: string;
  badgeRank: BadgeRankName;
  cor: string;
  temDivisoes: boolean;
}

export const ESFERAS: Record<Esfera, { nome: string; descricao: string }> = {
  3: { nome: 'Serviço', descricao: 'Constância, proteção e oração pela comunidade' },
  2: { nome: 'Missão', descricao: 'Vigilância, formação e envio para servir' },
  1: { nome: 'Sabedoria', descricao: 'Discernimento, maturidade e promoção da paz' },
};

export const XP_ACOES = {
  ORAR: 5,
  INTERCEDER: 1,
  LICAO: 10,
  QUIZ: 3,
  STREAK_7: 12,
  STREAK_30: 50,
  INDICAR: 15,
} as const;

export const PC_ACOES = {
  ORAR: 6,
  LICAO: 8,
  QUIZ: 4,
  STREAK_7: 20,
  STREAK_30: 60,
  INDICAR: 12,
} as const;

const PATENTES_RAW: Omit<Patente, 'esferaNome'>[] = [
  {
    id: 'servo-fiel',
    nome: 'Servo Fiel',
    descricao: 'Constância e serviço na vida de oração',
    xpMin: 0,
    esfera: 3,
    badgeRank: 'servo-fiel',
    cor: '#B1844D',
    temDivisoes: true,
  },
  {
    id: 'guardiao',
    nome: 'Guardião',
    descricao: 'Proteção e cuidado pela comunidade',
    xpMin: 300,
    esfera: 3,
    badgeRank: 'guardiao',
    cor: '#7F9A75',
    temDivisoes: true,
  },
  {
    id: 'intercessor',
    nome: 'Intercessor',
    descricao: 'Perseverança em oração constante',
    xpMin: 800,
    esfera: 3,
    badgeRank: 'intercessor',
    cor: '#9B6540',
    temDivisoes: true,
  },
  {
    id: 'atalaia',
    nome: 'Atalaia',
    descricao: 'Vigilância espiritual e prontidão',
    xpMin: 1800,
    esfera: 2,
    badgeRank: 'atalaia',
    cor: '#B1844D',
    temDivisoes: true,
  },
  {
    id: 'discipulador',
    nome: 'Discipulador',
    descricao: 'Formação e multiplicação da fé',
    xpMin: 3500,
    esfera: 2,
    badgeRank: 'discipulador',
    cor: '#C3A067',
    temDivisoes: true,
  },
  {
    id: 'missionario',
    nome: 'Missionário',
    descricao: 'Disponibilidade para ir e servir',
    xpMin: 6000,
    esfera: 2,
    badgeRank: 'missionario',
    cor: '#D9D0B8',
    temDivisoes: true,
  },
  {
    id: 'conselheiro',
    nome: 'Conselheiro',
    descricao: 'Discernimento para orientar com cuidado',
    xpMin: 9500,
    esfera: 1,
    badgeRank: 'conselheiro',
    cor: '#B1844D',
    temDivisoes: true,
  },
  {
    id: 'pacificador',
    nome: 'Pacificador',
    descricao: 'Maturidade para promover comunhão e paz',
    xpMin: 18500,
    esfera: 1,
    badgeRank: 'pacificador',
    cor: '#7F9A75',
    temDivisoes: false,
  },
];

export const PATENTES: Patente[] = PATENTES_RAW.map((p) => ({
  ...p,
  esferaNome: ESFERAS[p.esfera].nome,
}));

export function XP_PARA_DIVISAO(xpMin: number, xpMax: number, divisao: Divisao): number {
  const intervalo = xpMax - xpMin;
  return xpMin + Math.floor((intervalo / 4) * (divisao - 1));
}

export function calcularPatente(xp: number): Patente {
  let patente = PATENTES[0];
  for (const p of PATENTES) {
    if (xp >= p.xpMin) patente = p;
  }
  return patente;
}

export function calcularBonusIndicacao(xp: number): number {
  const patenteIndex = PATENTES.findIndex(patente => patente.id === calcularPatente(xp).id);
  return (patenteIndex + 1) * 5;
}

export function calcularDivisao(xp: number): { patente: Patente; divisao: Divisao | null; pc: number } {
  const patente = calcularPatente(xp);
  const idx = PATENTES.indexOf(patente);

  if (!patente.temDivisoes || idx === PATENTES.length - 1) {
    return { patente, divisao: null, pc: 100 };
  }

  const proximo = PATENTES[idx + 1];
  const intervalo = proximo.xpMin - patente.xpMin;
  const progresso = xp - patente.xpMin;
  const pcPorDivisao = intervalo / 4;

  const divisaoNum = Math.min(4, Math.floor(progresso / pcPorDivisao) + 1) as Divisao;
  const pc = Math.min(100, Math.round(((progresso % pcPorDivisao) / pcPorDivisao) * 100));

  return { patente, divisao: divisaoNum, pc };
}

export function calcularProgressoProximoNivel(xp: number): {
  atual: Patente;
  proximo: Patente | null;
  porcentagem: number;
  divisao: Divisao | null;
  pc: number;
} {
  const { patente: atual, divisao, pc } = calcularDivisao(xp);
  const idx = PATENTES.indexOf(atual);
  const proximo = idx < PATENTES.length - 1 ? PATENTES[idx + 1] : null;

  if (!proximo) {
    return { atual, proximo: null, porcentagem: 100, divisao: null, pc: 100 };
  }

  const intervalo = proximo.xpMin - atual.xpMin;
  const progresso = xp - atual.xpMin;
  const porcentagem = Math.min(100, Math.round((progresso / intervalo) * 100));

  return { atual, proximo, porcentagem, divisao, pc };
}

export function formatarDivisao(divisao: Divisao | null): string {
  if (!divisao) return '—';
  const romanos = ['IV', 'III', 'II', 'I'];
  return romanos[divisao - 1];
}

const PATENTES_LEGADAS: Record<string, string> = {
  anjo: 'Servo Fiel',
  arcanjo: 'Guardião',
  guardiao: 'Intercessor',
  vigia: 'Atalaia',
  mensageiro: 'Discipulador',
  ofanim: 'Missionário',
  hayot: 'Conselheiro',
  querubim: 'Conselheiro',
  serafim: 'Pacificador',
};

export function nomePatenteAtual(nome: string): string {
  const chave = nome.trim().toLocaleLowerCase('pt-BR');
  return PATENTES_LEGADAS[chave] ?? nome;
}

export type NivelChama = 'acesa' | 'fraca' | 'oscillando' | 'quase_apagada' | 'apagada';

export const CHAMA_LABEL: Record<NivelChama, string> = {
  acesa: 'Fogo Aceso',
  fraca: 'Chama Fraca',
  oscillando: 'Oscilando',
  quase_apagada: 'Quase Apagada',
  apagada: 'Apagada',
};

export const CHAMA_COR: Record<NivelChama, string> = {
  acesa: 'text-orange-400',
  fraca: 'text-amber-300',
  oscillando: 'text-yellow-200',
  quase_apagada: 'text-slate-400',
  apagada: 'text-slate-600',
};

export function calcularChama(ultimaAtividade?: string | null): NivelChama {
  if (!ultimaAtividade) return 'apagada';

  const agora = new Date();
  const ultima = new Date(ultimaAtividade);
  const diffDias = Math.floor((agora.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias <= 3) return 'acesa';
  if (diffDias <= 7) return 'fraca';
  if (diffDias <= 14) return 'oscillando';
  if (diffDias <= 20) return 'quase_apagada';
  return 'apagada';
}

export const CHAMA_ICONE: Record<NivelChama, string> = {
  acesa: '🔥',
  fraca: '🔥',
  oscillando: '🔥',
  quase_apagada: '🕯️',
  apagada: '🕯️',
};
