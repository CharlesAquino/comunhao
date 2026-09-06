export interface KesefEconomyMetrics {
  gerado_em: string;
  inicio_em: string;
  semanas: number;
  emissao: { total: number; membros: number; mediana_semanal: number; p25_semanal: number; p75_semanal: number; p90_semanal: number };
  segmentos: { recorrentes: number; ocasionais: number };
  saldos: { total: number; mediana: number; p90: number; top_10_percentual: number; gini: number };
  movimentacao: { emitido_regular: number; debitado: number; taxa_drenagem: number };
  tipos: Array<{ tipo: string; movimentos: number; quantidade_liquida: number; creditos: number; debitos: number }>;
}

export type CantinaEventStatus = 'rascunho' | 'anunciado' | 'reservas_abertas' | 'reservas_encerradas' | 'aberto' | 'pausado' | 'encerrado' | 'cancelado';
export type CantinaEventType = 'culto' | 'congresso' | 'acampamento' | 'retiro' | 'outro';

export interface CantinaEvent {
  id: string;
  nome: string;
  tipo: CantinaEventType;
  local: string;
  inicio_em: string;
  fim_em: string;
  reservas_abrem_em: string | null;
  reservas_fecham_em: string | null;
  cancelamento_ate: string | null;
  tolerancia_retirada_minutos: number;
  status: CantinaEventStatus;
  criado_em: string;
}

export interface CantinaStockItem {
  lote_id: string;
  produto_id: string;
  produto_nome: string;
  descricao: string;
  unidade: string;
  alergenicos: string[];
  imagem_url: string | null;
  quantidade_recebida: number;
  quantidade_disponivel: number;
  validade_em: string | null;
  conservacao: string | null;
  origem: string | null;
  anuncio_id: string | null;
  anuncio_status: 'rascunho' | 'pronto_para_revisao' | 'publicado' | 'pausado' | 'encerrado' | null;
  valor_kesef: number | null;
}

export interface CantinaPublicListing {
  anuncio_id: string;
  evento_id: string;
  evento_nome: string;
  evento_tipo: CantinaEventType;
  evento_local: string;
  inicio_em: string;
  fim_em: string;
  reservas_abrem_em: string | null;
  reservas_fecham_em: string | null;
  evento_status: CantinaEventStatus;
  produto_nome: string;
  descricao: string;
  unidade: string;
  alergenicos: string[];
  imagem_url: string | null;
  valor_kesef: number;
  limite_por_membro: number;
  quantidade_reservavel: number;
  quantidade_disponivel: number;
}

export type CantinaReservationStatus = 'reservada' | 'retirada' | 'cancelada' | 'nao_compareceu' | 'doada';

export interface CantinaReservation {
  id: string;
  evento_id: string;
  anuncio_id: string;
  evento_nome: string;
  evento_local: string;
  inicio_em: string;
  fim_em: string;
  cancelamento_ate: string | null;
  produto_nome: string;
  imagem_url: string | null;
  quantidade: number;
  valor_unitario_kesef: number;
  kesef_aprovisionado: number;
  status: CantinaReservationStatus;
  codigo_retirada: string;
  reservada_em: string;
}

export interface CantinaPickup {
  reserva_id: string;
  codigo_retirada: string;
  status: CantinaReservationStatus;
  quantidade: number;
  kesef_aprovisionado: number;
  reservada_em: string;
  produto_nome: string;
  membro_nome: string;
  membro_username: string | null;
}

export interface CantinaImmediateRedemption {
  id: string;
  codigo: string;
  total_kesef: number;
  expira_em: string;
}

export interface CantinaImmediateRedemptionPreview extends CantinaImmediateRedemption {
  saldo: number;
  evento: string;
  itens: Array<{ nome: string; quantidade: number; subtotal_kesef: number }>;
}

export interface CantinaRedemptionReportRow {
  registro_id: string;
  origem: 'imediato' | 'reserva';
  evento_id: string;
  evento_nome: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_username: string | null;
  produto_nome: string;
  quantidade: number;
  valor_unitario_kesef: number;
  total_kesef: number;
  status: string;
  realizado_em: string;
  operador_id: string | null;
  operador_nome: string | null;
  representante_nome: string | null;
}
