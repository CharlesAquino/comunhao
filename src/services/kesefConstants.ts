export const KESEF_VALORES = {
  ORACAO_CONFIRMADA: 10,
  INTERCEDER: 1,
  LICAO_CONCLUIDA: 10,
  QUIZ_ACERTO: 2,
  STREAK_7_DIAS: 15,
  STREAK_30_DIAS: 50,
  INDICACAO_MEMBRO_BASE: 5,
} as const;

export const KESEF_CAP_DIARIO = 60;

export type KesefTipo =
  | 'oracao'
  | 'licao'
  | 'quiz_acerto'
  | 'streak_bonus_7'
  | 'streak_bonus_30'
  | 'indicacao';

export const KESEF_PRECOS_LOJA = {
  CUPOM_CANTINA: 20,
  ADESIVO_LEMBRANCINHA: 30,
  LIVRO_DEVOCIONAL: 150,
  CAMISA_GRUPO: 300,
  ADORNO_ESPECIAL: 400,
  BIBLIA_ESTUDO: 500,
} as const;
