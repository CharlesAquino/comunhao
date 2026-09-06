import {
  Activity,
  BellRing,
  BookOpenCheck,
  BrainCircuit,
  Coins,
  Gauge,
  HeartHandshake,
  HandHeart,
  History,
  PackageOpen,
  Store,
  ShieldAlert,
  UsersRound,
  Wrench,
  ChartNoAxesCombined,
  type LucideIcon,
} from 'lucide-react';
import type { AdminPermission } from '../types/admin';

export interface AdminModuleDefinition {
  to: string;
  label: string;
  shortLabel: string;
  description: string;
  permission: AdminPermission;
  Icon: LucideIcon;
  group: 'supervisao' | 'conteudo' | 'operacao' | 'governanca';
  status: 'active' | 'planned';
}

export const ADMIN_MODULES: AdminModuleDefinition[] = [
  { to: '/admin', label: 'Visão geral', shortLabel: 'Início', description: 'Pendências e saúde da plataforma', permission: 'dashboard.read', Icon: Gauge, group: 'supervisao', status: 'active' },
  { to: '/admin/pessoas', label: 'Pessoas e acessos', shortLabel: 'Pessoas', description: 'Usuários, papéis e acompanhamento', permission: 'people.read', Icon: UsersRound, group: 'supervisao', status: 'active' },
  { to: '/admin/indicadores', label: 'Indicadores de usuários', shortLabel: 'Indicadores', description: 'Uso, Kesef e vínculos de interação', permission: 'people.sensitive', Icon: ChartNoAxesCombined, group: 'supervisao', status: 'active' },
  { to: '/admin/oracao', label: 'Oração e sorteio', shortLabel: 'Oração', description: 'Círculo, sessões e acompanhamento', permission: 'prayer.read', Icon: HeartHandshake, group: 'supervisao', status: 'active' },
  { to: '/admin/pastoral', label: 'Pastoral', shortLabel: 'Pastoral', description: 'Pedidos, acolhimento e assistência', permission: 'pastoral.read', Icon: HandHeart, group: 'supervisao', status: 'active' },
  { to: '/admin/moderacao', label: 'Moderação', shortLabel: 'Moderação', description: 'Mural, pedidos e ocorrências', permission: 'moderation.read', Icon: ShieldAlert, group: 'supervisao', status: 'active' },
  { to: '/admin/ebd', label: 'Editorial EBD', shortLabel: 'EBD', description: 'Lições, revisão e publicação', permission: 'ebd.read', Icon: BookOpenCheck, group: 'conteudo', status: 'active' },
  { to: '/admin/conhecimento', label: 'Memória sistêmica', shortLabel: 'Memória', description: 'Fontes, indexação e recuperação RAG', permission: 'knowledge.read', Icon: BrainCircuit, group: 'conteudo', status: 'active' },
  { to: '/admin/loja', label: 'Loja e estoque', shortLabel: 'Loja', description: 'Catálogo, resgates e entregas', permission: 'store.read', Icon: PackageOpen, group: 'operacao', status: 'active' },
  { to: '/admin/cantina', label: 'Cantina e economia', shortLabel: 'Cantina', description: 'Eventos efêmeros e calibração Kesef', permission: 'canteen.read', Icon: Store, group: 'operacao', status: 'active' },
  { to: '/admin/economia', label: 'Kesef e XP', shortLabel: 'Economia', description: 'Saldos, extratos e ajustes', permission: 'economy.read', Icon: Coins, group: 'operacao', status: 'planned' },
  { to: '/admin/notificacoes', label: 'Notificações', shortLabel: 'Notificações', description: 'Envios, falhas e reprocessamento', permission: 'notifications.read', Icon: BellRing, group: 'operacao', status: 'planned' },
  { to: '/admin/auditoria', label: 'Auditoria', shortLabel: 'Auditoria', description: 'Histórico das ações administrativas', permission: 'audit.read', Icon: History, group: 'governanca', status: 'active' },
  { to: '/admin/sistema', label: 'Operações do sistema', shortLabel: 'Sistema', description: 'Jobs, funções e integridade', permission: 'system.read', Icon: Activity, group: 'governanca', status: 'planned' },
  { to: '/admin/configuracoes', label: 'Configurações', shortLabel: 'Config.', description: 'Regras e parâmetros administrativos', permission: 'system.manage', Icon: Wrench, group: 'governanca', status: 'planned' },
];

export const ACTIVE_ADMIN_MODULES = ADMIN_MODULES.filter(module => module.status === 'active');
export const ACTIVE_ADMIN_PATHS = new Set(ACTIVE_ADMIN_MODULES.map(module => module.to));
