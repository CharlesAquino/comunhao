import { supabase } from './supabaseClient';
import type { LicaoEBD, PerguntaQuiz } from '../types';

export async function getLicoes(): Promise<LicaoEBD[]> {
  const { data, error } = await supabase
    .from('licoes')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return data as LicaoEBD[];
}

export async function getLicaoCompleta(licaoId: string): Promise<{ licao: LicaoEBD; perguntas: PerguntaQuiz[] }> {
  const [licaoResult, perguntasResult] = await Promise.all([
    supabase.from('licoes').select('*').eq('id', licaoId).single<LicaoEBD>(),
    supabase.from('licoes_perguntas').select('*').eq('licao_id', licaoId).order('id'),
  ]);

  if (licaoResult.error) throw licaoResult.error;
  if (perguntasResult.error) throw perguntasResult.error;

  return {
    licao: licaoResult.data,
    perguntas: (perguntasResult.data || []).map(pergunta => ({
      ...pergunta,
      alternativas: typeof pergunta.alternativas === 'string'
        ? JSON.parse(pergunta.alternativas)
        : pergunta.alternativas,
    })) as PerguntaQuiz[],
  };
}

export function verificarRespostaQuiz(pergunta: PerguntaQuiz, respostaIndex: number): boolean {
  return respostaIndex === pergunta.resposta_correta;
}

export async function adminCriarLicao(
  dados: Pick<LicaoEBD, 'titulo' | 'descricao' | 'referencia_biblica'>,
): Promise<LicaoEBD> {
  const { data: maxOrdem } = await supabase
    .from('licoes')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .single<{ ordem: number }>();

  const { data, error } = await supabase
    .from('licoes')
    .insert({ ...dados, ordem: (maxOrdem?.ordem ?? 0) + 1 })
    .select()
    .single<LicaoEBD>();

  if (error) throw error;
  return data;
}

export async function adminAtualizarLicao(
  id: string,
  updates: Partial<Pick<LicaoEBD, 'titulo' | 'descricao' | 'referencia_biblica' | 'ordem'>>,
): Promise<void> {
  const { error } = await supabase.from('licoes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function adminExcluirLicao(id: string): Promise<void> {
  const { error: questionError } = await supabase.from('licoes_perguntas').delete().eq('licao_id', id);
  if (questionError) throw questionError;
  const { error } = await supabase.from('licoes').delete().eq('id', id);
  if (error) throw error;
}

export async function adminAdicionarPergunta(dados: Omit<PerguntaQuiz, 'id'>): Promise<PerguntaQuiz> {
  const { data, error } = await supabase
    .from('licoes_perguntas')
    .insert({
      licao_id: dados.licao_id,
      pergunta: dados.pergunta,
      alternativas: dados.alternativas,
      resposta_correta: dados.resposta_correta,
    })
    .select()
    .single<PerguntaQuiz>();

  if (error) throw error;
  return data;
}

export async function adminAtualizarPergunta(
  id: string,
  updates: Partial<Omit<PerguntaQuiz, 'id' | 'licao_id'>>,
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (updates.pergunta !== undefined) updateData.pergunta = updates.pergunta;
  if (updates.alternativas !== undefined) updateData.alternativas = updates.alternativas;
  if (updates.resposta_correta !== undefined) updateData.resposta_correta = updates.resposta_correta;

  const { error } = await supabase.from('licoes_perguntas').update(updateData).eq('id', id);
  if (error) throw error;
}

export async function adminExcluirPergunta(id: string): Promise<void> {
  const { error } = await supabase.from('licoes_perguntas').delete().eq('id', id);
  if (error) throw error;
}
