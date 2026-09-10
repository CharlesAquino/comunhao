import { getCurrentUserId } from './dataService';
import { COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED, getStudyCatalog } from './comunhaoEstudosService';
import { PILOT_CATALOG, type StudyCatalog, type StudyCourse, type StudyLesson } from '../types/comunhaoEstudos';

interface StudyVisit {
  courseId: string;
  lessonId?: string;
  accessedAt: number;
}

export interface StudyResume {
  course: StudyCourse;
  lesson?: StudyLesson;
  path: string;
}

const storageKey = (userId: string) => `comunhao:study-last-visit:v1:${userId}`;

function readVisit(userId: string): StudyVisit | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null');
    return value && typeof value.courseId === 'string' && typeof value.accessedAt === 'number'
      ? value : null;
  } catch { return null; }
}

// Guarda somente a referência de navegação neste aparelho, separada por conta.
export async function recordStudyVisit(courseId: string, lessonId?: string): Promise<void> {
  const accessedAt = Date.now();
  try {
    const userId = await getCurrentUserId();
    const previous = readVisit(userId);
    if (previous && previous.accessedAt > accessedAt) return;
    localStorage.setItem(storageKey(userId), JSON.stringify({
      courseId,
      lessonId: lessonId ?? (previous?.courseId === courseId ? previous.lessonId : undefined),
      accessedAt,
    }));
  } catch { /* A navegação continua se o armazenamento estiver indisponível. */ }
}

export function selectStudyResume(catalog: StudyCatalog, visit: StudyVisit | null): StudyResume | null {
  const published = catalog.courses.filter(course => course.status === 'published');
  const course = published.find(item => item.id === visit?.courseId)
    ?? published.find(item => item.progress > 0 && item.progress < 100)
    ?? published[0];
  if (!course) return null;
  const lessons = course.modules.flatMap(module => module.lessons);
  const lastLesson = course.id === visit?.courseId
    ? lessons.find(lesson => lesson.id === visit.lessonId && lesson.status !== 'locked')
    : undefined;
  const lesson = lastLesson ?? lessons.find(item => item.status === 'current')
    ?? lessons.find(item => item.status === 'available');
  return {
    course,
    lesson,
    path: lesson ? `/estudos/aula/${encodeURIComponent(lesson.id)}` : `/estudos/curso/${encodeURIComponent(course.id)}`,
  };
}

export async function getHomeStudyResume(): Promise<StudyResume | null> {
  const [userId, catalog] = await Promise.all([
    getCurrentUserId(),
    COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED ? getStudyCatalog() : Promise.resolve(PILOT_CATALOG),
  ]);
  return selectStudyResume(catalog, readVisit(userId));
}
