import type { EbdEditorialDay } from '../types/ebdEditorial';

export type EditorialLanguageIssueCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_REPEATS_DAY'
  | 'SUBTITLE_REPEATS_TITLE'
  | 'REPEATED_WHITESPACE';

export interface EditorialLanguageIssue {
  code: EditorialLanguageIssueCode;
  field: 'title' | 'subtitle';
  message: string;
}

export function normalizeEditorialText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isRedundantEditorialTitle(title: string, dayLabel: string): boolean {
  const normalizedTitle = normalizeEditorialText(title);
  return Boolean(normalizedTitle) && normalizedTitle === normalizeEditorialText(dayLabel);
}

export function validateEditorialDayLanguage(day: Pick<EbdEditorialDay, 'label' | 'title' | 'subtitle'>): EditorialLanguageIssue[] {
  const issues: EditorialLanguageIssue[] = [];
  const title = day.title.trim();
  const subtitle = day.subtitle.trim();

  if (!title) {
    issues.push({ code: 'TITLE_REQUIRED', field: 'title', message: 'Dê ao dia um título que apresente o assunto estudado.' });
  } else if (isRedundantEditorialTitle(title, day.label)) {
    issues.push({ code: 'TITLE_REPEATS_DAY', field: 'title', message: `O título deve apresentar o tema, sem repetir “${day.label}”.` });
  }

  if (subtitle && normalizeEditorialText(subtitle) === normalizeEditorialText(title)) {
    issues.push({ code: 'SUBTITLE_REPEATS_TITLE', field: 'subtitle', message: 'O subtítulo deve complementar o título, sem repeti-lo.' });
  }

  if (/\s{2,}/.test(day.title)) {
    issues.push({ code: 'REPEATED_WHITESPACE', field: 'title', message: 'Remova espaços repetidos do título.' });
  }
  if (/\s{2,}/.test(day.subtitle)) {
    issues.push({ code: 'REPEATED_WHITESPACE', field: 'subtitle', message: 'Remova espaços repetidos do subtítulo.' });
  }

  return issues;
}

