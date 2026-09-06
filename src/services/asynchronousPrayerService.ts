import { supabase } from './supabaseClient';

export type PrayerRequestCategory = 'familia' | 'saude' | 'fe' | 'estudos' | 'trabalho' | 'relacionamentos' | 'outro';
export type PrayerRequestVisibility = 'dupla' | 'intercessores' | 'lideranca';
export type PrayerRequestFollowUp = 'somente_oracao' | 'mensagem' | 'conversa';

export interface AvailablePrayerRequest {
  id: string;
  categoria: PrayerRequestCategory;
  intencao: string | null;
  acompanhamento: PrayerRequestFollowUp;
  criado_em: string;
  expira_em: string;
  autor_nome: string;
  autor_foto: string | null;
  anonimo: boolean;
  minha_intercessao_id: string | null;
  minha_intercessao_status: 'assumida' | 'concluida' | 'desistiu' | null;
}

export interface MyPrayerRequest {
  id: string;
  categoria: PrayerRequestCategory;
  intencao: string | null;
  visibilidade: PrayerRequestVisibility;
  identificado?: boolean;
  acompanhamento: PrayerRequestFollowUp;
  status: 'aberto' | 'acolhido' | 'encerrado' | 'expirado' | 'cancelado';
  criado_em: string;
  expira_em: string;
  total_intercessores: number;
  total_confirmacoes: number;
  ultima_confirmacao_em: string | null;
  ultima_mensagem: string | null;
  ultimo_intercessor_nome: string | null;
}

export interface CreatePrayerRequestInput {
  categoria: PrayerRequestCategory;
  intencao?: string;
  visibilidade: PrayerRequestVisibility;
  identificado: boolean;
  acompanhamento: PrayerRequestFollowUp;
  diasValidade: 1 | 3 | 7;
}

export async function createPrayerRequest(input: CreatePrayerRequestInput): Promise<void> {
  const { error } = await supabase.rpc('criar_pedido_oracao_v2', {
    p_categoria: input.categoria,
    p_intencao: input.intencao?.trim() || null,
    p_visibilidade: input.visibilidade,
    p_identificado: input.identificado,
    p_acompanhamento: input.acompanhamento,
    p_dias_validade: input.diasValidade,
  });
  if (error) throw error;
}

export async function listAvailablePrayerRequests(limit = 20): Promise<AvailablePrayerRequest[]> {
  const { data, error } = await supabase.rpc('listar_pedidos_oracao_disponiveis', { p_limite: limit });
  if (error) throw error;
  return (data || []) as AvailablePrayerRequest[];
}

export async function listMyPrayerRequests(): Promise<MyPrayerRequest[]> {
  const { data, error } = await supabase.rpc('listar_meus_pedidos_oracao');
  if (error) throw error;
  return (data || []).map((row: MyPrayerRequest) => ({
    ...row,
    total_intercessores: Number(row.total_intercessores || 0),
    total_confirmacoes: Number(row.total_confirmacoes || 0),
  }));
}

export async function embracePrayerRequest(requestId: string): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('acolher_pedido_oracao', { p_pedido_id: requestId });
  if (error) throw error;
  return data as { id: string };
}

export async function confirmPrayer(intercessionId: string, message?: string): Promise<void> {
  const { error } = await supabase.rpc('confirmar_intercessao_oracao', {
    p_intercessao_id: intercessionId,
    p_mensagem: message?.trim() || null,
  });
  if (error) throw error;
}

export async function closePrayerRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('encerrar_pedido_oracao', { p_pedido_id: requestId });
  if (error) throw error;
}
