import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PILOT_CATALOG, PILOT_COURSE, type StudyCourse } from '../types/comunhaoEstudos';

const { getCurrentUserId } = vi.hoisted(() => ({ getCurrentUserId: vi.fn() }));
vi.mock('../services/dataService', () => ({ getCurrentUserId }));
vi.mock('../services/comunhaoEstudosService', () => ({
  COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED: false,
  getStudyCatalog: vi.fn(),
}));

import { getHomeStudyResume, recordStudyVisit, selectStudyResume } from '../services/studyResumeService';

describe('retomada de Estudos na Home', () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentUserId.mockResolvedValue('conta-a');
  });

  it('apresenta a primeira aula e a capa do piloto no primeiro acesso', () => {
    const result = selectStudyResume(PILOT_CATALOG, null);
    expect(result?.lesson?.title).toBe('A Palavra se fez carne');
    expect(result?.course.coverLight).toBe(PILOT_COURSE.coverLight);
    expect(result?.path).toBe('/estudos/aula/aula-1-o-verbo');
  });

  it('mantém título, capa e destino no mesmo curso visitado', () => {
    const second: StudyCourse = {
      ...structuredClone(PILOT_COURSE), id: 'segundo', title: 'Outro estudo', coverLight: '/outro.png',
      modules: [{ ...PILOT_COURSE.modules[0], lessons: [{ ...PILOT_COURSE.modules[0].lessons[0], id: 'outra-aula', title: 'Onde parei' }] }],
    };
    const result = selectStudyResume({ ...PILOT_CATALOG, courses: [PILOT_COURSE, second] }, { courseId: 'segundo', lessonId: 'outra-aula', accessedAt: 1 });
    expect(result?.lesson?.title).toBe('Onde parei');
    expect(result?.course.coverLight).toBe('/outro.png');
    expect(result?.path).toBe('/estudos/aula/outra-aula');
  });

  it('não retoma uma aula bloqueada nem um curso retirado do catálogo', () => {
    const result = selectStudyResume(PILOT_CATALOG, { courseId: PILOT_COURSE.id, lessonId: 'aula-2-sinais', accessedAt: 1 });
    expect(result?.path).toBe('/estudos/aula/aula-1-o-verbo');
    expect(selectStudyResume({ ...PILOT_CATALOG, courses: [{ ...PILOT_COURSE, status: 'archived' }] }, null)).toBeNull();
  });

  it('prioriza um curso em andamento quando não há histórico local', () => {
    const started = { ...PILOT_COURSE, id: 'iniciado', progress: 25 };
    expect(selectStudyResume({ ...PILOT_CATALOG, courses: [PILOT_COURSE, started] }, null)?.course.id).toBe('iniciado');
  });

  it('preserva a última aula ao voltar para a apresentação do mesmo curso', async () => {
    await recordStudyVisit(PILOT_COURSE.id, 'aula-1-o-verbo');
    await recordStudyVisit(PILOT_COURSE.id);
    expect((await getHomeStudyResume())?.lesson?.id).toBe('aula-1-o-verbo');
    const saved = JSON.parse(localStorage.getItem('comunhao:study-last-visit:v1:conta-a')!);
    expect(saved.lessonId).toBe('aula-1-o-verbo');
  });

  it('separa o histórico por conta e tolera armazenamento inválido', async () => {
    await recordStudyVisit('curso-da-conta-a', 'aula-a');
    getCurrentUserId.mockResolvedValue('conta-b');
    expect((await getHomeStudyResume())?.course.id).toBe(PILOT_COURSE.id);
    localStorage.setItem('comunhao:study-last-visit:v1:conta-b', 'inválido');
    expect((await getHomeStudyResume())?.course.id).toBe(PILOT_COURSE.id);
  });
});
