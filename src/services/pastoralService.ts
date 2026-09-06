import { supabase } from './supabaseClient';
import type {
  PastoralCarePriority,
  PastoralCareStatus,
  PastoralCareType,
  PastoralPrayerRequest,
} from '../types/admin';
import { listPublicInstitutionalCrests } from './institutionalCrestService';

export interface SavePastoralCareInput {
  requestId: string;
  status: PastoralCareStatus;
  priority: PastoralCarePriority;
  careType: PastoralCareType;
  notes?: string | null;
  assignToMe?: boolean;
}

export async function listPastoralPrayerRequests(): Promise<PastoralPrayerRequest[]> {
  const { data, error } = await supabase.rpc('listar_pedidos_pastorais');
  if (error) throw error;
  const rows = (data || []) as PastoralPrayerRequest[];
  const crests = await listPublicInstitutionalCrests(rows.flatMap(item => item.autor_id ? [item.autor_id] : []));
  return rows.map(item => ({
    ...item,
    total_intercessores: Number(item.total_intercessores || 0),
    total_confirmacoes: Number(item.total_confirmacoes || 0),
    autor_brasao_institucional: item.autor_id ? crests[item.autor_id] ?? null : null,
  }));
}

export async function savePastoralCare(input: SavePastoralCareInput): Promise<void> {
  const { error } = await supabase.rpc('salvar_acompanhamento_pastoral', {
    p_pedido_id: input.requestId,
    p_status: input.status,
    p_prioridade: input.priority,
    p_tipo_cuidado: input.careType,
    p_observacoes: input.notes?.trim() || null,
    p_atribuir_a_mim: input.assignToMe ?? false,
  });
  if (error) throw error;
}
