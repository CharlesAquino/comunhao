import type { AdminPermission, AdminRoleCode } from '../types/admin';

const ALL_PERMISSIONS: AdminPermission[] = [
  'admin.access', 'dashboard.read',
  'people.read', 'people.manage', 'people.roles', 'people.sensitive',
  'prayer.read', 'prayer.manage', 'prayer.draw',
  'pastoral.read', 'pastoral.manage',
  'moderation.read', 'moderation.manage',
  'ebd.read', 'ebd.manage', 'ebd.review', 'ebd.publish', 'estudos.review', 'estudos.manage', 'estudos.publish',
  'knowledge.read', 'knowledge.manage',
  'store.read', 'store.manage',
  'economy.read', 'economy.adjust',
  'canteen.read', 'canteen.events.manage', 'canteen.team.manage',
  'canteen.inventory.manage', 'canteen.checkout.operate',
  'canteen.redemptions.read', 'canteen.redemptions.reverse', 'canteen.reports.read',
  'notifications.read', 'notifications.manage',
  'audit.read', 'system.read', 'system.manage',
];

export const ROLE_PERMISSIONS: Record<AdminRoleCode, AdminPermission[]> = {
  administrador: ALL_PERMISSIONS,
  guardiao: [
    'admin.access', 'dashboard.read',
    'people.read',
    'prayer.read', 'prayer.manage',
    'moderation.read', 'moderation.manage',
    'notifications.read',
  ],
  editor_ebd: [
    'admin.access', 'dashboard.read',
    'ebd.read', 'ebd.manage',
    'knowledge.read',
  ],
  revisor_ebd: [
    'admin.access', 'dashboard.read',
    'ebd.read', 'ebd.review', 'ebd.publish',
    'knowledge.read',
  ],
  operador_loja: [
    'admin.access', 'dashboard.read',
    'store.read', 'store.manage',
    'economy.read',
    'canteen.read', 'canteen.checkout.operate', 'canteen.redemptions.read',
  ],
  gestor_cantina: [
    'admin.access', 'dashboard.read', 'economy.read',
    'canteen.read', 'canteen.events.manage', 'canteen.team.manage',
    'canteen.inventory.manage', 'canteen.checkout.operate',
    'canteen.redemptions.read', 'canteen.redemptions.reverse', 'canteen.reports.read',
  ],
  operador_cantina: [
    'admin.access', 'dashboard.read', 'economy.read',
    'store.read', 'store.manage', 'canteen.read',
    'canteen.checkout.operate', 'canteen.redemptions.read',
  ],
  pastoral: [
    'admin.access', 'dashboard.read',
    'people.read', 'people.sensitive',
    'pastoral.read', 'pastoral.manage',
  ],
  revisor_estudos: ['estudos.review'],
  editor_estudos: ['estudos.manage'],
  tecnico: [
    'admin.access', 'dashboard.read',
    'notifications.read', 'notifications.manage',
    'audit.read', 'system.read', 'system.manage',
  ],
};

export function legacyRoleToAdminRoles(role: string | null | undefined): AdminRoleCode[] {
  if (role === 'admin') return ['administrador'];
  if (role === 'mod') return ['guardiao'];
  return [];
}

export function permissionsForRoles(roles: AdminRoleCode[]): AdminPermission[] {
  return Array.from(new Set(roles.flatMap(role => ROLE_PERMISSIONS[role] ?? [])));
}
