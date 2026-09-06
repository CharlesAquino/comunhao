import { legacyRoleToAdminRoles, permissionsForRoles } from '../admin/accessControl';
import type { AdminAccessProfile, AdminAuditRecord, AdminDashboardSummary, AdminPermission, AdminRoleAssignment, AdminRoleCode, AdminUserKpiReport } from '../types/admin';
import { supabase } from './supabaseClient';

const EMPTY_SUMMARY: AdminDashboardSummary = {
  usersTotal: 0,
  usersActive: 0,
  prayerRequests: 0,
  storePending: 0,
  editorialReview: 0,
  ragProcessing: 0,
  ragErrors: 0,
  pushFailures: 0,
  openPrayerSessions: 0,
};

function normalizeAccess(raw: unknown): AdminAccessProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const roles = Array.isArray(value.roles) ? value.roles.filter(item => typeof item === 'string') as AdminRoleCode[] : [];
  const permissions = Array.isArray(value.permissions) ? value.permissions.filter(item => typeof item === 'string') as AdminPermission[] : [];
  return {
    userId: typeof value.user_id === 'string' ? value.user_id : null,
    legacyRole: typeof value.legacy_role === 'string' ? value.legacy_role : 'membro',
    roles,
    permissions,
  };
}

export async function getAdminAccessProfile(): Promise<AdminAccessProfile> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_obter_acesso_atual');
  if (!rpcError) {
    const normalized = normalizeAccess(rpcData);
    if (normalized) return normalized;
  }

  let currentUserId: string;
  const { data: profileId, error: profileIdError } = await supabase.rpc('usuario_atual_id');
  if (profileIdError || typeof profileId !== 'string' || !profileId) {
    return { userId: null, legacyRole: 'membro', roles: [], permissions: [] };
  }
  currentUserId = profileId;

  const { data: profile } = await supabase
    .from('usuarios')
    .select('id, papel')
    .eq('id', currentUserId)
    .maybeSingle<{ id: string; papel: string }>();

  const roles = legacyRoleToAdminRoles(profile?.papel);
  return {
    userId: profile?.id ?? null,
    legacyRole: profile?.papel ?? 'membro',
    roles,
    permissions: permissionsForRoles(roles),
  };
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data, error } = await supabase.rpc('admin_obter_resumo');
  if (error || !data || typeof data !== 'object') return EMPTY_SUMMARY;
  const raw = data as Record<string, unknown>;
  const number = (key: string) => typeof raw[key] === 'number' ? raw[key] as number : Number(raw[key] ?? 0) || 0;
  return {
    usersTotal: number('users_total'),
    usersActive: number('users_active'),
    prayerRequests: number('prayer_requests'),
    storePending: number('store_pending'),
    editorialReview: number('editorial_review'),
    ragProcessing: number('rag_processing'),
    ragErrors: number('rag_errors'),
    pushFailures: number('push_failures'),
    openPrayerSessions: number('open_prayer_sessions'),
  };
}

export async function listAdminAudit(limit = 50): Promise<AdminAuditRecord[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, actor_user_id, permission, action, entity_type, entity_id, reason, status, error_message, created_at, actor:usuarios!admin_audit_log_actor_user_id_fkey(nome)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    actor_user_id: typeof item.actor_user_id === 'string' ? item.actor_user_id : null,
    actor_name: typeof (item.actor as { nome?: unknown } | null)?.nome === 'string' ? (item.actor as { nome: string }).nome : null,
    permission: String(item.permission ?? ''),
    action: String(item.action ?? ''),
    entity_type: String(item.entity_type ?? ''),
    entity_id: typeof item.entity_id === 'string' ? item.entity_id : null,
    reason: typeof item.reason === 'string' ? item.reason : null,
    status: item.status === 'failure' ? 'failure' : 'success',
    error_message: typeof item.error_message === 'string' ? item.error_message : null,
    created_at: String(item.created_at),
  }));
}

export async function listAdminRoleAssignments(): Promise<AdminRoleAssignment[]> {
  const { data, error } = await supabase
    .from('admin_role_assignments')
    .select('id, usuario_id, role_code, active, reason, created_at, updated_at')
    .eq('active', true)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    usuario_id: String(item.usuario_id),
    role_code: String(item.role_code) as AdminRoleCode,
    active: item.active !== false,
    reason: String(item.reason ?? ''),
    created_at: String(item.created_at ?? ''),
    updated_at: String(item.updated_at ?? ''),
  }));
}

export async function assignAdminRole(usuarioId: string, roleCode: AdminRoleCode, reason: string): Promise<void> {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 8) throw new Error('Informe um motivo com pelo menos 8 caracteres.');

  const { error } = await supabase.rpc('admin_atribuir_papel', {
    p_usuario_id: usuarioId,
    p_role_code: roleCode,
    p_reason: normalizedReason,
  });
  if (error) throw error;
}

export async function removeAdminRole(usuarioId: string, roleCode: AdminRoleCode, reason: string): Promise<void> {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 8) throw new Error('Informe um motivo com pelo menos 8 caracteres.');

  const { error } = await supabase.rpc('admin_remover_papel', {
    p_usuario_id: usuarioId,
    p_role_code: roleCode,
    p_reason: normalizedReason,
  });
  if (error) throw error;
}

export async function getAdminUserKpis(periodoDias: 7 | 30 | 90): Promise<AdminUserKpiReport> {
  const { data, error } = await supabase.rpc('admin_listar_kpis_usuarios', { p_periodo_dias: periodoDias });
  if (error) throw error;
  return data as AdminUserKpiReport;
}
