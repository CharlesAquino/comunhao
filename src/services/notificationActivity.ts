import type { AppNotification } from './notificationService';

export type FiltroAtividade = 'todas' | 'oracoes' | 'mural' | 'ebd';
export type CategoriaAtividade = 'oracoes' | 'mural' | 'ebd' | 'geral';
export type AcaoAtividade = 'visualizar' | 'entrar' | 'responder';

export interface ApresentacaoAtividade {
  categoria: CategoriaAtividade;
  etiqueta: string;
  acao: {
    id: AcaoAtividade;
    label: string;
  };
}

const ATIVIDADES: Record<string, ApresentacaoAtividade> = {
  pedido_oracao_acolhido: {
    categoria: 'oracoes',
    etiqueta: 'Acolhimento',
    acao: { id: 'visualizar', label: 'Ver pedido' },
  },
  intercessao_confirmada: {
    categoria: 'oracoes',
    etiqueta: 'Intercessão',
    acao: { id: 'visualizar', label: 'Ver acolhimento' },
  },
  mao_levantada: {
    categoria: 'oracoes',
    etiqueta: 'Oração',
    acao: { id: 'entrar', label: 'Entrar' },
  },
  mao_aceita: {
    categoria: 'oracoes',
    etiqueta: 'Oração',
    acao: { id: 'entrar', label: 'Abrir oração' },
  },
  orando_com: {
    categoria: 'oracoes',
    etiqueta: 'Oração',
    acao: { id: 'entrar', label: 'Abrir oração' },
  },
  convite_oracao: {
    categoria: 'oracoes',
    etiqueta: 'Convite',
    acao: { id: 'responder', label: 'Responder' },
  },
  convite_aceito: {
    categoria: 'oracoes',
    etiqueta: 'Oração',
    acao: { id: 'visualizar', label: 'Abrir' },
  },
  convite_recusado: {
    categoria: 'oracoes',
    etiqueta: 'Convite',
    acao: { id: 'visualizar', label: 'Visualizar' },
  },
  sorteio_circulo: {
    categoria: 'oracoes',
    etiqueta: 'Círculo',
    acao: { id: 'visualizar', label: 'Ver missão' },
  },
  intercessao_pedido: {
    categoria: 'mural',
    etiqueta: 'Intercessão',
    acao: { id: 'visualizar', label: 'Ver pedido' },
  },
  nova_publicacao_mural: {
    categoria: 'mural',
    etiqueta: 'Mural',
    acao: { id: 'visualizar', label: 'Ver publicação' },
  },
  comentario_publicacao: {
    categoria: 'mural',
    etiqueta: 'Comentário',
    acao: { id: 'visualizar', label: 'Ver comentário' },
  },
  curtida_publicacao: {
    categoria: 'mural',
    etiqueta: 'Curtida',
    acao: { id: 'visualizar', label: 'Ver publicação' },
  },
  nova_licao: {
    categoria: 'ebd',
    etiqueta: 'EBD',
    acao: { id: 'visualizar', label: 'Abrir lição' },
  },
};

const PADRAO: ApresentacaoAtividade = {
  categoria: 'geral',
  etiqueta: 'Comunhão',
  acao: { id: 'visualizar', label: 'Visualizar' },
};

export function obterApresentacaoAtividade(
  notificacao: AppNotification,
): ApresentacaoAtividade {
  return ATIVIDADES[notificacao.tipo] ?? PADRAO;
}

export function atividadePertenceAoFiltro(
  notificacao: AppNotification,
  filtro: FiltroAtividade,
): boolean {
  if (filtro === 'todas') return true;

  return obterApresentacaoAtividade(notificacao).categoria === filtro;
}
