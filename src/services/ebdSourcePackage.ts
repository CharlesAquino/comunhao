import type { EbdAiGeneratedBlock, EbdAiGeneratedDay, EbdBlockType, EbdEditorialDay } from '../types/ebdEditorial';
import { createRuntimeId } from '../utils/createRuntimeId';

export const SOURCE_SCHEMA = 'comunhao.ebd.source.v1';
export const SOURCE_BLOCKS: EbdBlockType[] = ['hero', 'text', 'scripture', 'character', 'timeline', 'reflection', 'mission', 'prayer', 'quiz', 'video'];
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const limits: Record<EbdBlockType, [number, number]> = {
  hero: [140, 500], text: [650, 1400], scripture: [500, 1300], character: [150, 560],
  timeline: [350, 1000], reflection: [220, 650], mission: [60, 260], prayer: [50, 220], quiz: [20, 180], video: [700, 1600],
};
export interface EditorialSourceDay {
  schemaVersion: string;
  lessonKey: string;
  dayKey: string;
  weekday: string;
  revision: number;
  day: EbdAiGeneratedDay;
  provenance: unknown[];
}
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: objeto inválido.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, path: string, max: number, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max || Array.from(value).some(c => { const n = c.charCodeAt(0); return n < 32 && ![9, 10, 13].includes(n); })) {
    throw new Error(`${path}: texto inválido ou maior que ${max} caracteres.`);
  }
  return value; // Não normalizar nem truncar o texto do autor.
}
function keys(value: Record<string, unknown>, allowed: string[], path: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${path}: campo não previsto no contrato.`);
}

export function parseEditorialSourceDay(input: unknown): EditorialSourceDay {
  const raw = object(input, 'Arquivo');
  keys(raw, ['schemaVersion', 'lessonKey', 'dayKey', 'weekday', 'revision', 'day', 'provenance'], 'Arquivo');
  if (raw.schemaVersion !== SOURCE_SCHEMA) throw new Error('Versão do pacote editorial não suportada.');
  const lessonKey = string(raw.lessonKey, 'lessonKey', 120);
  const dayKey = string(raw.dayKey, 'dayKey', 160);
  const weekday = string(raw.weekday, 'weekday', 12);
  if (!weekdays.includes(weekday)) throw new Error('O pacote aceita somente segunda a sábado.');
  if (!Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1) throw new Error('revision deve ser um inteiro positivo.');
  const day = object(raw.day, weekday);
  keys(day, ['title', 'subtitle', 'purpose', 'estimatedMinutes', 'blocks'], weekday);
  if (!Number.isInteger(day.estimatedMinutes) || Number(day.estimatedMinutes) < 1 || Number(day.estimatedMinutes) > 120) throw new Error(`${weekday}: duração inválida.`);
  if (!Array.isArray(day.blocks) || day.blocks.length !== 10) throw new Error(`${weekday}: são necessários os dez blocos completos.`);
  const blocks = day.blocks.map((value, index): EbdAiGeneratedBlock => {
    const block = object(value, `${weekday}/bloco ${index + 1}`);
    const type = SOURCE_BLOCKS[index];
    const path = `${weekday}/${type}`;
    keys(block, ['type', 'title', 'content', 'reference', 'altText', 'prompt', 'required', 'quizQuestions'], path);
    if (block.type !== type) throw new Error(`${path}: tipo ausente, duplicado ou fora de ordem.`);
    if (block.required !== !['hero', 'text'].includes(type)) throw new Error(`${path}: required incorreto.`);
    if (!Array.isArray(block.quizQuestions) || (type !== 'quiz' && block.quizQuestions.length !== 0) || (type === 'quiz' && block.quizQuestions.length !== 3)) throw new Error(`${path}: questões incompatíveis com o contrato.`);
    const quizQuestions = block.quizQuestions.map((value, i) => {
      const question = object(value, `${path}/questão ${i + 1}`);
      keys(question, ['prompt', 'selectionMode', 'options', 'correctAnswers', 'explanation'], path);
      if (!['single', 'multiple'].includes(String(question.selectionMode))) throw new Error(`${path}: modo de resposta inválido.`);
      if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error(`${path}: cada questão precisa de quatro alternativas.`);
      const options = question.options.map(option => string(option, `${path}/alternativa`, 240));
      if (new Set(options.map(option => option.trim().toLocaleLowerCase('pt-BR'))).size !== 4) throw new Error(`${path}: alternativas repetidas.`);
      const answers = question.correctAnswers;
      if (!Array.isArray(answers) || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3) || new Set(answers).size !== answers.length || (question.selectionMode === 'single' ? answers.length !== 1 : answers.length < 2 || answers.length > 3)) throw new Error(`${path}: gabarito inválido (use índices de 0 a 3).`);
      return { prompt: string(question.prompt, `${path}/pergunta`, 500), selectionMode: question.selectionMode as 'single' | 'multiple', options, correctAnswers: answers as number[], explanation: string(question.explanation, `${path}/explicação`, 700) };
    });
    return {
      type, title: string(block.title, `${path}/título`, 100),
      content: string(block.content, `${path}/conteúdo`, 12000),
      reference: string(block.reference, `${path}/referência`, 180, type === 'scripture'),
      altText: string(block.altText, `${path}/altText`, 240, false), prompt: string(block.prompt, `${path}/prompt`, 600, false),
      required: block.required as boolean, quizQuestions,
    };
  });
  if (!Array.isArray(raw.provenance) || raw.provenance.length !== 10) throw new Error(`${weekday}: inclua a procedência dos dez blocos.`);
  const scopes = ['source_direct', 'biblical_exegesis', 'assembleian_doctrine', 'editorial_application'];
  const provenanceTypes = new Set<string>();
  for (const value of raw.provenance) {
    const entry = object(value, 'provenance');
    if (!SOURCE_BLOCKS.includes(entry.blockType as EbdBlockType) || provenanceTypes.has(String(entry.blockType))) throw new Error('provenance: tipo ausente ou repetido.');
    provenanceTypes.add(String(entry.blockType));
    for (const field of ['sourceIds', 'sourceLocators', 'claimScopes']) {
      if (!Array.isArray(entry[field]) || !(entry[field] as unknown[]).every(v => typeof v === 'string')) throw new Error(`provenance/${field}: lista inválida.`);
    }
    if (!(entry.claimScopes as string[]).length || (entry.claimScopes as string[]).some(scope => !scopes.includes(scope))) throw new Error('provenance: classificação inválida.');
    string(entry.notes, 'provenance/notes', 4000, false);
  }
  return { schemaVersion: SOURCE_SCHEMA, lessonKey, dayKey, weekday, revision: Number(raw.revision), day: {
    title: string(day.title, `${weekday}/título`, 120), subtitle: string(day.subtitle, `${weekday}/subtítulo`, 180),
    purpose: string(day.purpose, `${weekday}/objetivo`, 180), estimatedMinutes: Number(day.estimatedMinutes), blocks,
  }, provenance: raw.provenance };
}

export function sourceDayWarnings(source: EditorialSourceDay): string[] {
  return source.day.blocks.flatMap(block => {
    const notes: string[] = [];
    const [min, max] = limits[block.type];
    const length = block.content.trim().length;
    if (length < min || length > max) notes.push(`${block.type}: ${length} caracteres; faixa editorial ${min}–${max}.`);
    if (block.type === 'reflection' && ((block.content.match(/\?/g) ?? []).length !== 1 || !block.content.trim().endsWith('?'))) notes.push('reflection: revisar a pergunta única no encerramento.');
    if (['text', 'scripture', 'timeline'].includes(block.type) && block.content.includes('?')) notes.push(`${block.type}: revisar pergunta em texto expositivo.`);
    if (['hero', 'video'].includes(block.type)) notes.push(`${block.type}: mídia ainda precisa ser produzida ou vinculada; o pacote contém somente texto e orientação.`);
    return notes;
  });
}

export function extractEditorialSourceDay(source: EditorialSourceDay, target: EbdEditorialDay, types: EbdBlockType[]): EbdEditorialDay {
  if (source.weekday !== target.day || target.day === 'sunday') throw new Error('O arquivo não corresponde ao dia selecionado.');
  if (!types.length || new Set(types).size !== types.length || types.some(type => !SOURCE_BLOCKS.includes(type))) throw new Error('Selecione tipos de bloco válidos.');
  const blocks = source.day.blocks.filter(block => types.includes(block.type)).map(block => {
    const { quizQuestions, ...fields } = block;
    return { ...fields, id: createRuntimeId(), ...(block.type === 'quiz' ? { settings: { questions: quizQuestions.map(q => ({ ...q, id: createRuntimeId() })) } } : {}) };
  });
  // Estimativa local para os blocos escolhidos; não depende de modelo externo.
  const words = blocks.reduce((sum, block) => sum + block.content.trim().split(/\s+/).length, 0);
  const interactionMinutes = blocks.filter(b => ['reflection', 'mission', 'prayer', 'quiz'].includes(b.type)).length;
  return { ...target, title: source.day.title, subtitle: source.day.subtitle, purpose: source.day.purpose, estimatedMinutes: Math.max(1, Math.ceil(words / 180) + interactionMinutes), blocks };
}
