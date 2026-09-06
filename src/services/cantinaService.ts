import { supabase } from './supabaseClient';
import type { CantinaEvent, CantinaEventType, CantinaImmediateRedemption, CantinaImmediateRedemptionPreview, CantinaPickup, CantinaPublicListing, CantinaRedemptionReportRow, CantinaReservation, CantinaStockItem, KesefEconomyMetrics } from '../types/cantina';

export interface CreateCantinaEventInput {
  nome: string;
  tipo: CantinaEventType;
  local: string;
  inicioEm: string;
  fimEm: string;
  reservasAbremEm?: string;
  reservasFechamEm?: string;
  cancelamentoAte?: string;
  toleranciaRetiradaMinutos: number;
}

export async function getKesefEconomyMetrics(semanas = 12): Promise<KesefEconomyMetrics> {
  const { data, error } = await supabase.rpc('admin_obter_metricas_kesef', { p_semanas: semanas });
  if (error) throw error;
  return data as unknown as KesefEconomyMetrics;
}

export async function listCantinaEvents(): Promise<CantinaEvent[]> {
  const { data, error } = await supabase
    .from('cantina_eventos')
    .select('id, nome, tipo, local, inicio_em, fim_em, reservas_abrem_em, reservas_fecham_em, cancelamento_ate, tolerancia_retirada_minutos, status, criado_em')
    .order('inicio_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CantinaEvent[];
}

export async function createCantinaEvent(input: CreateCantinaEventInput): Promise<CantinaEvent> {
  const iso = (value?: string) => value ? new Date(value).toISOString() : null;
  const { data, error } = await supabase.rpc('cantina_criar_evento', {
    p_nome: input.nome.trim(),
    p_tipo: input.tipo,
    p_local: input.local.trim(),
    p_inicio_em: iso(input.inicioEm),
    p_fim_em: iso(input.fimEm),
    p_reservas_abrem_em: iso(input.reservasAbremEm),
    p_reservas_fecham_em: iso(input.reservasFechamEm),
    p_cancelamento_ate: iso(input.cancelamentoAte),
    p_tolerancia_retirada_minutos: input.toleranciaRetiradaMinutos,
  });
  if (error) throw error;
  return data as unknown as CantinaEvent;
}

export async function updateCantinaEvent(eventoId: string, input: CreateCantinaEventInput): Promise<CantinaEvent> {
  const iso = (value?: string) => value ? new Date(value).toISOString() : null;
  const { data, error } = await supabase.rpc('cantina_editar_evento', {
    p_evento_id: eventoId, p_nome: input.nome.trim(), p_tipo: input.tipo, p_local: input.local.trim(),
    p_inicio_em: iso(input.inicioEm), p_fim_em: iso(input.fimEm), p_reservas_abrem_em: iso(input.reservasAbremEm),
    p_reservas_fecham_em: iso(input.reservasFechamEm), p_cancelamento_ate: iso(input.cancelamentoAte),
    p_tolerancia_retirada_minutos: input.toleranciaRetiradaMinutos,
  });
  if (error) throw error;
  return data as unknown as CantinaEvent;
}

export interface RegisterCantinaStockInput {
  eventoId: string;
  produtoNome: string;
  descricao: string;
  unidade: string;
  alergenicos: string[];
  imagemUrl: string;
  origem: string;
  quantidade: number;
  valorKesef: number;
  limitePorMembro: number;
  quantidadeReservavel: number;
  validadeEm?: string;
  conservacao?: string;
  observacaoPrivada?: string;
}

export async function listCantinaStock(eventoId: string): Promise<CantinaStockItem[]> {
  const { data, error } = await supabase.rpc('cantina_listar_estoque_evento', { p_evento_id: eventoId });
  if (error) throw error;
  return (data ?? []) as CantinaStockItem[];
}

export async function registerCantinaStock(input: RegisterCantinaStockInput): Promise<void> {
  const { error } = await supabase.rpc('cantina_registrar_lote', {
    p_evento_id: input.eventoId,
    p_produto_nome: input.produtoNome.trim(),
    p_descricao: input.descricao.trim(),
    p_unidade: input.unidade,
    p_alergenicos: input.alergenicos,
    p_imagem_url: input.imagemUrl,
    p_origem: input.origem,
    p_quantidade: input.quantidade,
    p_valor_kesef: input.valorKesef,
    p_limite_por_membro: input.limitePorMembro,
    p_quantidade_reservavel: input.quantidadeReservavel,
    p_validade_em: input.validadeEm ? new Date(input.validadeEm).toISOString() : null,
    p_conservacao: input.conservacao?.trim() || null,
    p_observacao_privada: input.observacaoPrivada?.trim() || null,
  });
  if (error) throw error;
}

export async function publishCantinaEvent(eventoId: string): Promise<CantinaEvent> {
  const { data, error } = await supabase.rpc('cantina_publicar_evento', { p_evento_id: eventoId });
  if (error) throw error;
  return data as unknown as CantinaEvent;
}

export async function listPublicCantinaListings(): Promise<CantinaPublicListing[]> {
  const { data, error } = await supabase.rpc('cantina_listar_vitrine');
  if (error) throw error;
  return (data ?? []) as CantinaPublicListing[];
}

export async function reserveCantinaItem(anuncioId: string, quantidade: number, idempotencyKey: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_reservar', {
    p_anuncio_id: anuncioId,
    p_quantidade: quantidade,
    p_chave_idempotencia: idempotencyKey,
  });
  if (error) throw error;
}

export async function listMyCantinaReservations(): Promise<CantinaReservation[]> {
  const { data, error } = await supabase.rpc('cantina_minhas_reservas');
  if (error) throw error;
  return (data ?? []) as CantinaReservation[];
}

export async function cancelCantinaReservation(reservaId: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_cancelar_reserva', { p_reserva_id: reservaId });
  if (error) throw error;
}

export async function listCantinaPickups(eventoId: string): Promise<CantinaPickup[]> {
  const { data, error } = await supabase.rpc('cantina_listar_retiradas_evento', { p_evento_id: eventoId });
  if (error) throw error;
  return (data ?? []) as CantinaPickup[];
}

export async function confirmCantinaPickup(reservaId: string, codigo: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_confirmar_retirada', {
    p_reserva_id: reservaId,
    p_codigo_retirada: codigo,
  });
  if (error) throw error;
}

export async function createImmediateCantinaRedemption(eventoId: string, items: Array<{ anuncio_id: string; quantidade: number }>): Promise<CantinaImmediateRedemption> {
  const { data, error } = await supabase.rpc('cantina_criar_resgate_imediato', { p_evento_id: eventoId, p_itens: items });
  if (error) throw error;
  return data as unknown as CantinaImmediateRedemption;
}

export async function previewImmediateCantinaRedemption(code: string): Promise<CantinaImmediateRedemptionPreview> {
  const { data, error } = await supabase.rpc('cantina_consultar_resgate_imediato', { p_codigo: code });
  if (error) throw error;
  return data as unknown as CantinaImmediateRedemptionPreview;
}

export async function confirmImmediateCantinaRedemption(id: string, code: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_confirmar_resgate_imediato', { p_resgate_id: id, p_codigo: code });
  if (error) throw error;
}

export async function cancelImmediateCantinaRedemption(id: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_cancelar_resgate_imediato', { p_resgate_id: id });
  if (error) throw error;
}

export async function authorizeCantinaRepresentative(reservationId: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_autorizar_representante', { p_reserva_id: reservationId, p_username: username });
  if (error) throw error;
}

export async function markCantinaNoShow(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc('cantina_marcar_nao_comparecimento', { p_reserva_id: reservationId });
  if (error) throw error;
}

export async function getCantinaRedemptionReport(eventoId?: string): Promise<CantinaRedemptionReportRow[]> {
  const { data, error } = await supabase.rpc('cantina_relatorio_resgates', { p_evento_id: eventoId || null });
  if (error) throw error;
  return (data ?? []) as CantinaRedemptionReportRow[];
}
