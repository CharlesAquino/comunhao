import { supabase } from './supabaseClient';
import { listPublicInstitutionalCrests } from './institutionalCrestService';
import type { InstitutionalCrestKind } from './institutionalCrestRules';

export type PrayerAvailabilityMode = 'silencio' | 'texto' | 'voz' | 'video';
export interface PrayerAvailability { usuario_id: string; modalidades: PrayerAvailabilityMode[]; disponivel_ate: string; ativo: boolean; }
export interface AvailablePrayerPerson { usuario_id: string; nome: string; foto_url: string | null; modalidades: PrayerAvailabilityMode[]; disponivel_ate: string; brasao_institucional?: InstitutionalCrestKind | null; }

export async function configurePrayerAvailability(minutes: 15 | 30 | 60, modes: PrayerAvailabilityMode[]): Promise<PrayerAvailability> {
  const { data, error } = await supabase.rpc('configurar_disponibilidade_oracao', { p_minutos: minutes, p_modalidades: modes });
  if (error) throw error;
  return data as PrayerAvailability;
}
export async function endPrayerAvailability(): Promise<void> {
  const { error } = await supabase.rpc('encerrar_disponibilidade_oracao'); if (error) throw error;
}
export async function listPrayerAvailablePeople(): Promise<AvailablePrayerPerson[]> {
  const { data, error } = await supabase.rpc('listar_disponiveis_oracao');
  if (error) throw error;
  const rows = (data || []) as AvailablePrayerPerson[];
  const brasoes = await listPublicInstitutionalCrests(rows.map(person => person.usuario_id));
  return rows.map(person => ({ ...person, brasao_institucional: brasoes[person.usuario_id] ?? null }));
}
export async function getMyPrayerAvailability(): Promise<PrayerAvailability | null> {
  const { data, error } = await supabase.rpc('obter_minha_disponibilidade_oracao'); if (error) throw error; return data as PrayerAvailability | null;
}
