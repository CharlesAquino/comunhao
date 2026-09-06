import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpenCheck, BrainCircuit, HeartHandshake, PackageOpen, RefreshCw, ShieldAlert, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACTIVE_ADMIN_MODULES } from '../../admin/adminModules';
import { useAdmin } from '../../contexts/AdminContext';
import { getAdminDashboardSummary } from '../../services/adminAccessService';
import { subscribeToAdminStoreOrders } from '../../services/storeService';
import type { AdminDashboardSummary } from '../../types/admin';
import Button from '../../components/ui/Button';
import { getSaldoKesef } from '../../services/kesefService';

const EMPTY: AdminDashboardSummary = {
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

export default function AdminDashboard() {
  const { can } = useAdmin();
  const [summary, setSummary] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [kesefBalance, setKesefBalance] = useState<number | null>(null);
  const canReadStore = can('store.read');

  const load = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextBalance] = await Promise.all([
        getAdminDashboardSummary(),
        getSaldoKesef().catch(() => null),
      ]);
      setSummary(nextSummary);
      setKesefBalance(nextBalance);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!canReadStore) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToAdminStoreOrders(() => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void load(); }, 300);
    });
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [canReadStore]);

  const overview = useMemo(() => [
    { label: 'Pessoas', value: summary.usersTotal, Icon: UsersRound, to: '/admin/pessoas', permission: 'people.read' as const, tone: 'accent', image: null },
    { label: 'Revisões', value: summary.editorialReview, Icon: BookOpenCheck, to: '/admin/ebd', permission: 'ebd.read' as const, tone: 'celebration', image: null },
    { label: 'Pendências', value: summary.prayerRequests, Icon: ShieldAlert, to: '/admin/moderacao', permission: 'moderation.read' as const, tone: 'care', image: null },
    { label: 'Kesef', value: kesefBalance, Icon: null, to: '/carteira', permission: 'dashboard.read' as const, tone: 'celebration', image: '/kesef-coin.png' },
  ].filter(card => can(card.permission)), [can, kesefBalance, summary]);

  const preferredPaths = ['/admin/pessoas', '/admin/indicadores', '/admin/ebd', '/admin/cantina', '/admin/oracao', '/admin/moderacao', '/admin/conhecimento'];
  const availableModules = preferredPaths
    .map(path => ACTIVE_ADMIN_MODULES.find(module => module.to === path))
    .filter((module): module is NonNullable<typeof module> => Boolean(module && can(module.permission)));

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-2">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] txt-green sm:text-xs">Central de supervisão</p>
          <h2 className="mt-1.5 max-w-xl font-display text-[1.7rem] font-semibold leading-[1.02] tracking-[-0.035em] txt-primary sm:text-4xl">O que precisa da sua atenção?</h2>
        </div>
        <Button variant="secondary" className="shrink-0 px-3" onClick={load} disabled={loading} aria-label="Atualizar resumo administrativo">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> <span className="hidden min-[370px]:inline">Atualizar</span>
        </Button>
      </header>

      <section className="grid grid-cols-4 divide-x divide-[var(--border)]" aria-label="Resumo administrativo">
        {overview.map(({ label, value, Icon, to, tone, image }) => (
          <Link key={label} to={to} className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-1 px-1 text-center hover:bg-[var(--surface)]">
            <span className={`${tone === 'accent' ? 'text-[var(--accent-primary)]' : tone === 'care' ? 'text-[var(--care)]' : 'text-[var(--celebration)]'}`}>
              {image ? <img src={image} alt="" className="size-7 object-contain" /> : Icon ? <Icon size={22} aria-hidden="true" /> : null}
            </span>
            <span className="text-[11px] txt-secondary">{label}</span>
            <strong className="font-display text-xl font-semibold tabular-nums txt-primary">{loading || value === null ? '—' : value}</strong>
          </Link>
        ))}
      </section>

      {can('prayer.read') && (
        <Link to="/admin/oracao?aba=telemetria" className="card-surface group flex min-h-16 items-center gap-3 border border-[var(--green-subtle)] bg-[var(--accent-soft)] px-4 py-3 transition-premium hover:bg-[var(--surface-elevated)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent-primary)]"><Activity size={20} /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm text-[var(--text-primary)]">Abrir telemetria assistencial</strong><span className="mt-0.5 block text-xs text-[var(--text-secondary)]">Acompanhe chamadas, continuidade, círculo atual e sinais de cuidado.</span></span>
          <ArrowRight size={18} className="shrink-0 text-[var(--accent-primary)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl txt-primary">Áreas de trabalho</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {availableModules.map(({ to, label, description, Icon }) => (
            <Link key={to} to={to} className="card-surface group flex h-[6.75rem] items-center gap-3 overflow-hidden p-3 hover:bg-[var(--surface-elevated)]">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                {to === '/admin/cantina'
                  ? <img src="/kesef-coin.png" alt="" className="size-9 object-contain" />
                  : <Icon size={20} className={to === '/admin/moderacao' ? 'text-[var(--care)]' : to === '/admin/ebd' || to === '/admin/conhecimento' ? 'text-[var(--celebration)]' : 'txt-green'} />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-sm font-semibold leading-5 txt-primary">{label}</h4>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 txt-tertiary">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-activity-title">
        <h3 id="admin-activity-title" className="mb-3 font-display text-xl txt-primary">Prioridades</h3>
        <div className="divide-y divide-[var(--border)]">
          {can('store.read') && <Link to="/admin/loja" className="flex min-h-12 items-center gap-3 px-1 text-sm txt-primary hover:bg-[var(--surface-elevated)]"><PackageOpen size={18} className="text-[var(--celebration)]" /><span className="flex-1">{loading ? '—' : summary.storePending} pedido(s) da loja</span><ArrowRight size={16} className="txt-muted" /></Link>}
          {can('ebd.read') && <Link to="/admin/ebd" className="flex min-h-12 items-center gap-3 px-1 text-sm txt-primary hover:bg-[var(--surface-elevated)]"><BookOpenCheck size={18} className="text-[var(--accent-primary)]" /><span className="flex-1">{loading ? '—' : summary.editorialReview} conteúdo(s) para revisar</span><ArrowRight size={16} className="txt-muted" /></Link>}
          {can('prayer.read') && <Link to="/admin/oracao" className="flex min-h-12 items-center gap-3 px-1 text-sm txt-primary hover:bg-[var(--surface-elevated)]"><HeartHandshake size={18} className="text-[var(--care)]" /><span className="flex-1">Acompanhar pedidos de oração</span><ArrowRight size={16} className="txt-muted" /></Link>}
          {can('knowledge.read') && summary.ragErrors > 0 && <Link to="/admin/conhecimento" className="flex min-h-12 items-center gap-3 px-1 text-sm txt-primary hover:bg-[var(--surface-elevated)]"><BrainCircuit size={18} className="text-[var(--accent-primary)]" /><span className="flex-1">Revisar {summary.ragErrors} fonte(s) com erro</span><ArrowRight size={16} className="txt-muted" /></Link>}
        </div>
      </section>
    </div>
  );
}
