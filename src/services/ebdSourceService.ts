import { supabase } from './supabaseClient';
import { parseEditorialSourceDay, type EditorialSourceDay } from './ebdSourcePackage';

function packageError(error: { code?: string; message?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') return new Error('A biblioteca editorial ainda não foi habilitada neste ambiente. Aplique a migration ebd_source_days.');
  if (error.code === '23505') return new Error('Este dia e revisão já foram importados. Use a revisão existente ou aumente revision no novo arquivo.');
  return new Error('Não foi possível acessar a biblioteca editorial. Verifique sua conexão e permissão de gestão.');
}

export async function listEditorialSources(lessonId: string): Promise<EditorialSourceDay[]> {
  const { data, error } = await supabase.from('ebd_source_days').select('payload').eq('lesson_id', lessonId).order('revision', { ascending: false });
  if (error) throw packageError(error);
  return (data ?? []).map(row => parseEditorialSourceDay(row.payload));
}

export async function importEditorialSources(lessonId: string, sources: EditorialSourceDay[]): Promise<void> {
  if (!sources.length || sources.length > 6) throw new Error('Importe entre um e seis arquivos de dia.');
  const checked = sources.map(parseEditorialSourceDay);
  if (new Set(checked.map(s => `${s.lessonKey}/${s.revision}`)).size !== 1 || new Set(checked.map(s => s.weekday)).size !== checked.length) throw new Error('Os arquivos devem pertencer à mesma lição e revisão, sem dias repetidos.');
  const { error } = await supabase.from('ebd_source_days').insert(checked.map(source => ({ lesson_id: lessonId, lesson_key: source.lessonKey, weekday: source.weekday, revision: source.revision, payload: source })));
  if (error) throw packageError(error);
}
