export interface Usuario {
  id: string;
  nome: string;
  username?: string;
  telefone?: string;
  email_recuperacao?: string | null;
  telefone_verificado_em?: string | null;
  foto_url?: string | null;
  status_anel: 'offline' | 'disponivel' | 'orando';
  pontos_comunhao: number;
  xp: number;
  streak_dias?: number;
  orando_por_id?: string | null;
  sendo_orado_por_id?: string | null;
  last_login?: string;
  ultima_atividade?: string;
  criado_em?: string;
  papel?: 'admin' | 'membro' | 'mod';
  participa_sorteio?: boolean;
  perfil_capa?: string;
  brasao_institucional?: 'administrador' | 'pastoral' | 'equipe' | null;
}

export type TipoPublicacaoMural = 'em_clamor' | 'testemunho' | 'reflexao' | 'gratidao';
export type StatusPublicacaoMural = 'publicado' | 'em_oracao' | 'acompanhamento' | 'testemunho' | 'encerrado';

export interface MuralMedia {
  id: string;
  storagePath: string;
  signedUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  altText?: string | null;
}

export interface MuralComment {
  id: string;
  publicationId: string;
  authorId: string;
  parentId: string | null;
  text: string;
  createdAt: string;
  editedAt: string | null;
  authorName: string;
  authorUsername: string | null;
  authorPhotoUrl: string | null;
  authorXp: number;
  authorInstitutionalCrest?: 'administrador' | 'pastoral' | 'equipe' | null;
  isOwner: boolean;
}

export interface Pedido {
  id: string;
  autor_id?: string;
  autor?: { nome: string } | null;
  texto: string;
  tipo: TipoPublicacaoMural;
  criado_em?: string;
  finalizado_em?: string | null;
  intercessoes?: { count: number }[];
}

export interface PedidoMural {
  id: string;
  autor_id?: string;
  autor: string;
  autor_username?: string | null;
  autor_foto_url?: string | null;
  autor_xp: number;
  autor_brasao_institucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  texto: string;
  contagem: number;
  comentarios_contagem: number;
  intercedendo: boolean;
  recompensado?: boolean;
  tipo: TipoPublicacaoMural;
  status: StatusPublicacaoMural;
  permite_comentarios: boolean;
  criado_em: string;
  ultima_atualizacao_em?: string | null;
  media: MuralMedia | null;
}

export interface Intercessao {
  pedido_id: string;
  usuario_id: string;
  criado_em?: string;
}

export interface DashboardData {
  usuario: {
    id: string;
    nome: string;
    avatar?: string | null;
    status_anel: Usuario['status_anel'];
    ultima_atividade?: string | null;
    brasaoInstitucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  };
  missaoAtual: {
    id?: string;
    nome: string;
    avatar?: string | null;
    brasaoInstitucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  };
  parceiroSustentador: {
    id?: string;
    nome: string;
    avatar?: string | null;
    brasaoInstitucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  };
  mocidade: {
    id: string;
    nome: string;
    status_anel: Usuario['status_anel'];
    avatar?: string | null;
    perfilCapa?: string | null;
    brasaoInstitucional?: 'administrador' | 'pastoral' | 'equipe' | null;
    xp: number;
  }[];
}

export interface MocidadeGridProps {
  jovens: DashboardData['mocidade'];
}

export interface PedidoCardProps {
  id: string;
  autorId?: string;
  autor: string;
  autorUsername?: string | null;
  autorFotoUrl?: string | null;
  autorXp: number;
  autorBrasaoInstitucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  texto: string;
  criadoEm: string;
  contagemIntercessores: number;
  comentariosContagem: number;
  intercedendo: boolean;
  onInterceder: () => void;
  onComentariosAlterados?: (id: string, count: number) => void;
  tipo: TipoPublicacaoMural;
  status: StatusPublicacaoMural;
  permiteComentarios: boolean;
  media: MuralMedia | null;
  loading?: boolean;
  isAdmin?: boolean;
  onEditar?: (id: string, texto: string) => void;
  onExcluir?: (id: string) => void;
}

export interface PedidoAdmin {
  id: string;
  autor: string;
  autor_id: string;
  texto: string;
  tipo: TipoPublicacaoMural;
  criado_em: string;
  contagem_intercessores: number;
}

export interface LicaoEBD {
  id: string;
  titulo: string;
  descricao: string;
  texto_base?: string;
  referencia_biblica: string;
  ordem: number;
  criado_em?: string;
}

export interface PerguntaQuiz {
  id: string;
  licao_id: string;
  pergunta: string;
  alternativas: string[];
  resposta_correta: number;
}

export interface ResultadoQuiz {
  licao_id: string;
  acertos: number;
  total: number;
  finalizado_em: string;
}

export interface LojaItem {
  id: string;
  nome: string;
  descricao: string;
  preco_kesef: number;
  estoque: number;
  imagem_url: string;
  imagem_url_claro?: string | null;
  imagem_url_escuro?: string | null;
  categoria: string;
  ativo: boolean;
  estado?: 'ativo' | 'pausado' | 'arquivado';
  limite_por_membro?: number | null;
  retirada_instrucao?: string | null;
  retirada_previsao?: string | null;
  variantes?: LojaVariante[];
  imagens?: LojaItemImagem[];
  criado_em?: string;
}

export interface LojaVariante {
  id: string;
  item_id: string;
  sku: string;
  nome: string;
  atributos: Record<string, string>;
  estoque: number;
  estoque_alerta: number;
  ativo: boolean;
  ordem: number;
}

export interface LojaItemImagem {
  id: string;
  item_id: string;
  tema: 'claro' | 'escuro';
  url: string;
  texto_alternativo: string;
  ordem: number;
  ativo: boolean;
}

export interface LojaPedido {
  id: string;
  usuario_id: string;
  item_id: string;
  quantidade: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'entregue';
  kesef_debitado: number;
  solicitado_em: string;
  processado_em?: string | null;
  processado_por_admin_id?: string | null;
  observacoes?: string;
  variante_id?: string | null;
  variante?: LojaVariante | null;
  codigo_retirada?: string | null;
  reservado_em?: string | null;
  reserva_expira_em?: string | null;
  entregue_em?: string | null;
  entregue_por_id?: string | null;
  etapa_logistica?: LojaEtapaLogistica;
  entrega_agendada_em?: string | null;
  entrega_local?: string | null;
  instrucoes_retirada?: string | null;
  logistica_atualizada_em?: string | null;
  logistica_atualizada_por_id?: string | null;
  item?: LojaItem | null;
  usuario?: { nome: string; username?: string } | null;
  historico?: LojaPedidoHistorico[];
}

export type LojaEtapaLogistica = 'previsao_pendente' | 'agendado' | 'alinhamento_retirada';

export interface LojaPedidoHistorico {
  id: string;
  pedido_id: string;
  tipo: 'solicitado' | 'processado' | 'agendado' | 'alinhamento_retirada' | 'entregue' | 'rejeitado';
  titulo: string;
  descricao: string;
  etapa_logistica?: LojaEtapaLogistica | null;
  entrega_agendada_em?: string | null;
  entrega_local?: string | null;
  ocorrido_em: string;
}

export type MessageType = 'success' | 'error';

export interface AdminMessage {
  type: MessageType;
  text: string;
}

export interface SessaoOracaoGrupo {
  id: string;
  anfitriao_id: string;
  status: 'aberta' | 'encerrada';
  criado_em: string;
  encerrada_em?: string;
}

export interface SessaoGrupoParticipanteInfo {
  usuario_id: string;
  nome: string;
  foto_url: string | null;
}

export interface ProvaAscensao {
  id: string;
  usuario_id: string;
  tier_alvo: string;
  iniciada_em: string;
  expira_em: string;
  metas_cumpridas: { descricao: string; cumprida: boolean }[];
  status: 'ativa' | 'completa' | 'expirada';
}

export interface ResultadoVerificacaoProva {
  prova_id: string | null;
  concluida: boolean;
  tier_alvo: string | null;
  status: 'completa' | 'em_andamento' | 'sem_prova';
}

export interface EngajamentoJovem {
  id: string;
  nome: string;
  telefone?: string;
  foto_url?: string | null;
  status_anel: Usuario['status_anel'];
  dias_sem_login: number;
  ultima_intercessao?: string | null;
  pontos_comunhao: number;
  streak_dias?: number;
  papel?: string;
  participa_sorteio?: boolean;
  membro_validado_em?: string | null;
  bonus_indicacao?: number;
  semafaro: 'verde' | 'amarelo' | 'vermelho';
}
