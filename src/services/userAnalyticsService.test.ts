import { describe, expect, it } from 'vitest';
import { areaForPath } from './userAnalyticsRoutes';

describe('areaForPath', () => {
  it.each([
    ['/', 'inicio'], ['/mural', 'mural'], ['/ebd/licao', 'ebd'], ['/loja', 'tesouro'],
    ['/chat/abc', 'mensagens'], ['/sala/abc', 'oracao'], ['/ranking', 'jornada'],
    ['/perfil/abc', 'perfil'], ['/admin/pessoas', 'administracao'],
  ])('classifica %s como %s', (path, area) => expect(areaForPath(path)).toBe(area));
  it('ignora rotas públicas', () => expect(areaForPath('/login')).toBeNull());
});
