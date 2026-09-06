import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../utils/formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-29T12:00:00.000Z');

  it('mostra agora mesmo somente para menos de um minuto', () => {
    expect(formatRelativeTime('2026-07-29T11:59:30.000Z', now)).toBe('agora mesmo');
  });

  it('mostra minutos e horas corretamente', () => {
    expect(formatRelativeTime('2026-07-29T11:45:00.000Z', now)).toBe('há 15 min');
    expect(formatRelativeTime('2026-07-29T09:00:00.000Z', now)).toBe('há 3 h');
  });

  it('não chama uma publicação antiga de agora mesmo', () => {
    expect(formatRelativeTime('2026-07-24T12:00:00.000Z', now)).toBe('há 5 dias');
    expect(formatRelativeTime('2026-07-20T12:00:00.000Z', now)).toBe('20/07');
  });
});
