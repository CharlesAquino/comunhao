import type { AdminRoleCode } from '../types/admin';

export type InstitutionalCrestKind = 'administrador' | 'pastoral' | 'equipe';

export const INSTITUTIONAL_CREST_LABELS: Record<InstitutionalCrestKind, string> = {
  administrador: 'Brasão de Administração da Comunhão',
  pastoral: 'Brasão de Cuidado Pastoral',
  equipe: 'Brasão de Serviço Administrativo',
};

const ADMINISTRATIVE_ROLES = new Set<AdminRoleCode>([
  'guardiao',
  'editor_ebd',
  'revisor_ebd',
  'operador_loja',
  'tecnico',
]);

export function resolveInstitutionalCrest(
  roles: AdminRoleCode[],
  legacyRole: string,
): InstitutionalCrestKind | null {
  if (roles.includes('administrador') || legacyRole === 'admin') return 'administrador';
  if (roles.includes('pastoral')) return 'pastoral';
  if (roles.some(role => ADMINISTRATIVE_ROLES.has(role)) || legacyRole === 'mod') return 'equipe';
  return null;
}

export function getInstitutionalCrestLabel(kind: InstitutionalCrestKind): string {
  return INSTITUTIONAL_CREST_LABELS[kind];
}
