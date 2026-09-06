export type AdminRoleCode =
  | 'administrador'
  | 'guardiao'
  | 'editor_ebd'
  | 'revisor_ebd'
  | 'operador_loja'
  | 'gestor_cantina'
  | 'operador_cantina'
  | 'pastoral'
  | 'revisor_estudos'
  | 'editor_estudos'
  | 'tecnico';

export type AdminPermission =
  | 'admin.access'
  | 'dashboard.read'
  | 'people.read'
  | 'people.manage'
  | 'people.roles'
  | 'people.sensitive'
  | 'prayer.read'
  | 'prayer.manage'
  | 'prayer.draw'
  | 'pastoral.read'
  | 'pastoral.manage'
  | 'moderation.read'
  | 'moderation.manage'
  | 'ebd.read'
  | 'ebd.manage'
  | 'ebd.review'
  | 'ebd.publish'
  | 'estudos.review'
  | 'estudos.manage'
  | 'estudos.publish'
  | 'knowledge.read'
  | 'knowledge.manage'
  | 'store.read'
  | 'store.manage'
  | 'economy.read'
  | 'economy.adjust'
  | 'canteen.read'
  | 'canteen.events.manage'
  | 'canteen.team.manage'
  | 'canteen.inventory.manage'
  | 'canteen.checkout.operate'
  | 'canteen.redemptions.read'
  | 'canteen.redemptions.reverse'
  | 'canteen.reports.read'
  | 'notifications.read'
  | 'notifications.manage'
  | 'audit.read'
  | 'system.read'
  | 'system.manage';

export interface AdminAccessProfile {
  userId: string | null;
  legacyRole: string;
  roles: AdminRoleCode[];
  permissions: AdminPermission[];
}

export interface AdminDashboardSummary {
  usersTotal: number;
  usersActive: number;
  prayerRequests: number;
  storePending: number;
  editorialReview: number;
  ragProcessing: number;
  ragErrors: number;
  pushFailures: number;
  openPrayerSessions: number;
}

export interface AdminAuditRecord {
  id: string;
  actor_user_id: string | null;
  actor_name?: string | null;
  permission: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: string;
}

export interface AdminRoleAssignment {
  id: string;
  usuario_id: string;
  role_code: AdminRoleCode;
  active: boolean;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface UserKpiArea { area: string; acessos: number }
export interface UserKpiInteraction {
  usuario_id: string;
  nome: string;
  foto_url: string | null;
  total: number;
  tipos: Record<string, number>;
}
export interface AdminUserKpi {
  usuario_id: string;
  nome: string;
  foto_url: string | null;
  last_login: string | null;
  kesef_saldo: number;
  kesef_recebido: number;
  kesef_utilizado: number;
  total_acessos: number;
  areas: UserKpiArea[];
  interacoes: UserKpiInteraction[];
}
export interface AdminUserKpiReport {
  periodo_dias: 7 | 30 | 90;
  gerado_em: string;
  usuarios: AdminUserKpi[];
}

export type PastoralCareStatus = 'novo' | 'em_acolhimento' | 'acompanhamento' | 'encaminhado' | 'concluido' | 'arquivado';
export type PastoralCarePriority = 'baixa' | 'normal' | 'alta' | 'urgente';
export type PastoralCareType = 'oracao' | 'escuta' | 'visita' | 'assistencia' | 'encaminhamento';

export interface PastoralPrayerRequest {
  id: string;
  categoria: string;
  intencao: string | null;
  visibilidade: string;
  identificado: boolean;
  acompanhamento: string;
  pedido_status: string;
  criado_em: string;
  expira_em: string;
  autor_id: string | null;
  autor_nome: string;
  autor_foto: string | null;
  autor_brasao_institucional?: 'administrador' | 'pastoral' | 'equipe' | null;
  total_intercessores: number;
  total_confirmacoes: number;
  cuidado_status: PastoralCareStatus;
  prioridade: PastoralCarePriority;
  tipo_cuidado: PastoralCareType;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  observacoes: string | null;
  atualizado_em: string | null;
}
