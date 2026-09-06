export type KnowledgeScope =
  | 'global'
  | 'ebd'
  | 'estudos'
  | 'oracao'
  | 'mural'
  | 'formacao'
  | 'administrativo';

export type KnowledgeCategory =
  | 'licao'
  | 'biblia'
  | 'doutrina'
  | 'manual'
  | 'documento'
  | 'politica'
  | 'roteiro'
  | 'outro';

export type KnowledgeStatus = 'processing' | 'ready' | 'error' | 'archived';

export interface KnowledgeSource {
  id: string;
  title: string;
  description: string;
  scope: KnowledgeScope;
  category: KnowledgeCategory;
  tags: string[];
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  checksumSha256: string;
  status: KnowledgeStatus;
  active: boolean;
  totalChunks: number;
  totalCharacters: number;
  pages?: number | null;
  metadata: Record<string, unknown>;
  error?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface KnowledgeSearchResult {
  chunk_id: number;
  fonte_id: string;
  fonte_titulo: string;
  escopo: KnowledgeScope;
  categoria: KnowledgeCategory;
  chunk_index: number;
  conteudo: string;
  metadata: Record<string, unknown>;
  similaridade_semantica: number;
  relevancia_lexical: number;
  score_final: number;
}

export interface KnowledgeUploadInput {
  file: File;
  title: string;
  description: string;
  scope: KnowledgeScope;
  category: KnowledgeCategory;
  tags: string[];
}

export const KNOWLEDGE_SCOPES: Array<{ value: KnowledgeScope; label: string; description: string }> = [
  { value: 'global', label: 'Toda a plataforma', description: 'Disponível para qualquer módulo sistêmico.' },
  { value: 'ebd', label: 'EBD', description: 'Lições, pedagogia, revista e formação bíblica.' },
  { value: 'estudos', label: 'Estudos Bíblicos', description: 'Cursos, módulos, aulas e materiais de formação bíblica.' },
  { value: 'oracao', label: 'Oração', description: 'Intercessão, salas e orientações pastorais.' },
  { value: 'mural', label: 'Mural', description: 'Moderação e conteúdo comunitário.' },
  { value: 'formacao', label: 'Formação', description: 'Discipulado, patentes e materiais de apoio.' },
  { value: 'administrativo', label: 'Administrativo', description: 'Normas internas e operação da plataforma.' },
];

export const KNOWLEDGE_CATEGORIES: Array<{ value: KnowledgeCategory; label: string }> = [
  { value: 'licao', label: 'Lição / revista' },
  { value: 'biblia', label: 'Texto ou referência bíblica' },
  { value: 'doutrina', label: 'Doutrina' },
  { value: 'manual', label: 'Manual' },
  { value: 'documento', label: 'Documento geral' },
  { value: 'politica', label: 'Política / regra' },
  { value: 'roteiro', label: 'Roteiro' },
  { value: 'outro', label: 'Outro' },
];
