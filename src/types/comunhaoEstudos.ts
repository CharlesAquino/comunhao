export type StudyBlockType = 'video' | 'scripture' | 'context' | 'reflection' | 'mission' | 'meeting' | 'audio' | 'resource';
export type CourseStatus = 'draft' | 'pastoral_review' | 'published' | 'archived' | 'coming_soon';
export type LessonStatus = 'available' | 'current' | 'locked' | 'completed';

export interface StudyBlock {
  id: string;
  type: StudyBlockType;
  title: string;
  summary: string;
  content?: Record<string, unknown>;
  order: number;
  required: boolean;
  completed: boolean;
}

export interface StudyLesson {
  id: string;
  slug: string;
  title: string;
  reference: string;
  description: string;
  durationMinutes: number;
  order: number;
  version: number;
  status: LessonStatus;
  blocks: StudyBlock[];
}

export interface StudyModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  lessons: StudyLesson[];
}

export interface StudyCourse {
  id: string;
  slug: string;
  trackId: string;
  title: string;
  subtitle: string;
  description: string;
  minister: string;
  level: 'fundamentos' | 'intermediario' | 'aprofundamento';
  durationMinutes: number;
  version: number;
  status: CourseStatus;
  progress: number;
  certificateEnabled: boolean;
  coverLight?: string;
  coverDark?: string;
  bannerLight?: string;
  bannerDark?: string;
  heroImage?: string;
  tags: string[];
  knowledgeSourceIds: string[];
  modules: StudyModule[];
}

export interface StudyAiLessonGenerationInput {
  courseId: string;
  lessonId: string;
  audience: string;
  tone: string;
  objective: string;
  additionalInstructions: string;
  selectedBlockTypes: StudyBlockType[];
}

export interface StudyAiGeneratedLesson {
  title: string;
  description: string;
  reference: string;
  estimatedMinutes: number;
  blocks: Array<{
    type: StudyBlockType;
    title: string;
    summary: string;
    body: string;
    reference: string;
    discussionPrompt: string;
    action: string;
    required: boolean;
  }>;
}

export interface StudyTrack {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
}

export interface StudyCertificate {
  id: string;
  courseId: string;
  validationCode: string;
  issuedAt: string;
  courseVersion: number;
  pastoralValidity: boolean;
}

export interface StudyCatalog {
  tracks: StudyTrack[];
  courses: StudyCourse[];
  certificates: StudyCertificate[];
}

const PILOT_BLOCKS: StudyBlock[] = [
  { id: 'video', type: 'video', title: 'Estudo principal', summary: 'Conheça a ideia central deste estudo em uma experiência breve e guiada.', order: 1, required: true, completed: false },
  { id: 'scripture', type: 'scripture', title: 'Texto bíblico', summary: 'Leia João 1:1–18 e observe como João apresenta Jesus.', order: 2, required: true, completed: false },
  { id: 'context', type: 'context', title: 'Contexto do texto', summary: 'Entenda o mundo e as palavras que ajudam a iluminar esta passagem.', order: 3, required: true, completed: false },
  { id: 'reflection', type: 'reflection', title: 'Pergunta de reflexão', summary: 'Pare um momento e responda com suas próprias palavras.', order: 4, required: true, completed: false },
  { id: 'mission', type: 'mission', title: 'Missão da semana', summary: 'Leve o que você aprendeu para uma situação concreta da sua semana.', order: 5, required: true, completed: false },
  { id: 'meeting', type: 'meeting', title: 'Encontro com o pastor', summary: 'Participe da conversa e leve a pergunta que nasceu durante o estudo.', order: 6, required: true, completed: false },
];

export const PILOT_TRACKS: StudyTrack[] = [
  { id: 'trilha-fundamentos', slug: 'fundamentos-da-fe', title: 'Fundamentos da fé', description: 'Percursos essenciais para compreender o evangelho e firmar a vida cristã.', order: 1 },
  { id: 'trilha-biblia', slug: 'livros-da-biblia', title: 'Livros da Bíblia', description: 'Cursos que percorrem livros bíblicos com contexto, unidade e aplicação.', order: 2 },
  { id: 'trilha-vida', slug: 'vida-crista', title: 'Vida cristã', description: 'Formação para viver a fé em comunhão, serviço e missão.', order: 3 },
];

export const PILOT_COURSE: StudyCourse = {
  id: 'curso-quem-e-jesus',
  slug: 'quem-e-jesus',
  trackId: 'trilha-fundamentos',
  title: 'Quem é Jesus?',
  subtitle: 'Uma jornada pelo Evangelho de João',
  description: 'Quatro módulos ordenados para reconhecer quem Jesus revela ser e como essa verdade transforma nossa vida.',
  minister: 'Pastor ministrador',
  level: 'fundamentos',
  durationMinutes: 96,
  version: 1,
  status: 'published',
  progress: 0,
  certificateEnabled: true,
  coverLight: '/studies/courses/quem-e-jesus/card-light-v1.png',
  coverDark: '/studies/courses/quem-e-jesus/card-dark-v1.png',
  bannerLight: '/studies/courses/quem-e-jesus/banner-light-v1.png',
  bannerDark: '/studies/courses/quem-e-jesus/banner-dark-v1.png',
  heroImage: '/studies/courses/quem-e-jesus/hero-v1.png',
  tags: ['Jesus', 'Evangelho de João', 'Fundamentos'],
  knowledgeSourceIds: [],
  modules: [
    {
      id: 'modulo-1-o-verbo', slug: 'o-verbo-se-fez-carne', title: 'O Verbo se fez carne', description: 'Jesus apresentado como a Palavra eterna que entrou em nossa história.', order: 1,
      lessons: [{ id: 'aula-1-o-verbo', slug: 'o-verbo-se-fez-carne', title: 'A Palavra se fez carne', reference: 'João 1:1–18', description: 'Reconheça quem Jesus revela ser no início do Evangelho de João.', durationMinutes: 24, order: 1, version: 1, status: 'current', blocks: PILOT_BLOCKS }],
    },
    {
      id: 'modulo-2-sinais', slug: 'sinais-que-revelam', title: 'Sinais que revelam', description: 'Os sinais de Jesus apontam para sua identidade e sua glória.', order: 2,
      lessons: [{ id: 'aula-2-sinais', slug: 'sinais-que-revelam', title: 'O primeiro sinal', reference: 'João 2:1–11', description: 'Observe o que o primeiro sinal revela sobre Jesus.', durationMinutes: 24, order: 1, version: 1, status: 'locked', blocks: [] }],
    },
    {
      id: 'modulo-3-eu-sou', slug: 'eu-sou', title: 'Eu sou', description: 'As declarações de Jesus iluminam sua identidade e seu chamado.', order: 3,
      lessons: [{ id: 'aula-3-eu-sou', slug: 'eu-sou', title: 'Luz e videira verdadeira', reference: 'João 8:12; 15:1–11', description: 'Compreenda duas imagens centrais usadas por Jesus.', durationMinutes: 24, order: 1, version: 1, status: 'locked', blocks: [] }],
    },
    {
      id: 'modulo-4-vida-envio', slug: 'vida-morte-e-envio', title: 'Vida, morte e envio', description: 'A ressurreição confirma a identidade de Jesus e envia seus discípulos.', order: 4,
      lessons: [{ id: 'aula-4-vida-envio', slug: 'vida-morte-e-envio', title: 'Meu Senhor e meu Deus', reference: 'João 20:1–31', description: 'Conclua a jornada olhando para a ressurreição e o envio.', durationMinutes: 24, order: 1, version: 1, status: 'locked', blocks: [] }],
    },
  ],
};

export const PILOT_CATALOG: StudyCatalog = { tracks: PILOT_TRACKS, courses: [PILOT_COURSE], certificates: [] };

// Compatibilidade temporária com componentes de revisão anteriores.
export const PILOT_STUDY = {
  id: PILOT_COURSE.modules[0].lessons[0].id,
  season: PILOT_COURSE.title,
  week: 1,
  title: PILOT_COURSE.modules[0].lessons[0].title,
  reference: PILOT_COURSE.modules[0].lessons[0].reference,
  description: PILOT_COURSE.modules[0].lessons[0].description,
  progress: PILOT_COURSE.progress,
  version: PILOT_COURSE.modules[0].lessons[0].version,
  status: PILOT_COURSE.modules[0].lessons[0].status,
  blocks: PILOT_COURSE.modules[0].lessons[0].blocks,
};

export const STUDY_WEEKS = PILOT_COURSE.modules.map(module => ({
  week: module.order,
  title: module.lessons[0].title,
  reference: module.lessons[0].reference,
  progress: module.lessons[0].status === 'completed' ? 100 : 0,
  status: module.lessons[0].status,
}));
