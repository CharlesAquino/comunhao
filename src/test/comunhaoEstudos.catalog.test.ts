import { describe, expect, it } from 'vitest';
import { PILOT_CATALOG, PILOT_COURSE } from '../types/comunhaoEstudos';

describe('catálogo do Comunhão Estudos', () => {
  it('usa curso como unidade principal do catálogo', () => {
    expect(PILOT_CATALOG.courses).toHaveLength(1);
    expect(PILOT_CATALOG.courses[0].title).toBe('Quem é Jesus?');
    expect(PILOT_CATALOG.courses[0].certificateEnabled).toBe(true);
  });

  it('mantém módulos e aulas em ordem explícita', () => {
    expect(PILOT_COURSE.modules.map(module => module.order)).toEqual([1, 2, 3, 4]);
    expect(PILOT_COURSE.modules.flatMap(module => module.lessons).map(lesson => lesson.status)).toEqual(['current', 'locked', 'locked', 'locked']);
  });

  it('não expõe blocos como itens soltos do catálogo', () => {
    const catalogKeys = Object.keys(PILOT_CATALOG);
    expect(catalogKeys).toEqual(['tracks', 'courses', 'certificates']);
    expect(PILOT_COURSE.modules[0].lessons[0].blocks.length).toBeGreaterThan(0);
  });

  it('exige todos os blocos incluídos na aula piloto', () => {
    expect(PILOT_COURSE.modules[0].lessons[0].blocks.every(block => block.required)).toBe(true);
  });

  it('mantém fontes RAG vinculadas no nível do curso', () => {
    expect(PILOT_COURSE.knowledgeSourceIds).toEqual([]);
    expect(PILOT_COURSE.modules[0]).not.toHaveProperty('knowledgeSourceIds');
  });
});
