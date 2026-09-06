import { supabase } from './supabaseClient';
import { getCurrentUserId } from './dataService';

export type PrayerMode = 'texto' | 'silencio' | 'voz' | 'video';
export type PrayerJourneyStatus = 'preparando' | 'aguardando' | 'orando' | 'interrompida' | 'concluida' | 'cancelada';

export interface PrayerJourney {
  id: string;
  usuario_id: string;
  origem: 'convite' | 'mao_levantada' | 'sala_aberta';
  referencia_id: string;
  modalidade: PrayerMode;
  status: PrayerJourneyStatus;
  intencao_privada: string | null;
  etapa: 'necessidade' | 'convite' | 'aceite' | 'oracao' | 'encerramento' | 'acompanhamento';
  ultimo_sinal_em: string;
  acompanhamento_status: 'pendente' | 'bem' | 'precisa_apoio' | 'dispensado' | null;
  acompanhamento_nota: string | null;
  atualizado_em: string;
}

export async function startPrayerJourney(
  referenceId: string,
  mode: PrayerMode,
  privateIntention?: string,
): Promise<PrayerJourney> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('oracao_jornadas')
    .upsert({
      usuario_id: userId,
      origem: 'convite',
      referencia_id: referenceId,
      modalidade: mode,
      status: 'orando',
      intencao_privada: privateIntention?.trim() || null,
      etapa: 'oracao',
      iniciada_em: now,
      ultimo_sinal_em: now,
      atualizado_em: now,
    }, { onConflict: 'usuario_id,origem,referencia_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PrayerJourney;
}

export async function heartbeatPrayerJourney(referenceId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { error } = await supabase.from('oracao_jornadas').update({
    status: 'orando',
    etapa: 'oracao',
    ultimo_sinal_em: now,
    atualizado_em: now,
  }).eq('usuario_id', userId).eq('origem', 'convite').eq('referencia_id', referenceId);
  if (error) throw error;
}

export async function interruptPrayerJourney(referenceId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('oracao_jornadas').update({
    status: 'interrompida',
    ultimo_sinal_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId).eq('origem', 'convite').eq('referencia_id', referenceId).eq('status', 'orando');
  if (error) throw error;
}

export async function completePrayerJourney(referenceId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  const { error } = await supabase.from('oracao_jornadas').update({
    status: 'concluida',
    etapa: 'acompanhamento',
    concluida_em: now,
    acompanhamento_em: now,
    acompanhamento_status: 'pendente',
    atualizado_em: now,
  }).eq('usuario_id', userId).eq('origem', 'convite').eq('referencia_id', referenceId);
  if (error) throw error;
}

export async function getResumablePrayerJourney(): Promise<PrayerJourney | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from('oracao_jornadas').select('*')
    .eq('usuario_id', userId)
    .in('status', ['preparando', 'aguardando', 'orando', 'interrompida'])
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PrayerJourney | null;
}

export async function answerPrayerFollowUp(
  journeyId: string,
  status: 'bem' | 'precisa_apoio' | 'dispensado',
  note?: string,
): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('oracao_jornadas').update({
    acompanhamento_status: status,
    acompanhamento_nota: note?.trim() || null,
    atualizado_em: new Date().toISOString(),
  }).eq('id', journeyId).eq('usuario_id', userId);
  if (error) throw error;
}
