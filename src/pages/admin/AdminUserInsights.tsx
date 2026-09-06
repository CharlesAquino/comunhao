import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Coins, MessageCircleMore, RefreshCw, Search, UsersRound } from 'lucide-react';
import { AdminMetric, AdminMetricGrid, AdminPageHeader, AdminSection, KesefAmount } from '../../components/admin/AdminPage';
import Button from '../../components/ui/Button';
import { getAdminUserKpis } from '../../services/adminAccessService';
import type { AdminUserKpi, AdminUserKpiReport } from '../../types/admin';

const AREA_LABELS: Record<string, string> = {
  inicio: 'Início', mural: 'Mural', ebd: 'EBD', tesouro: 'Tesouro', carteira: 'Carteira',
  comunidade: 'Comunidade', mensagens: 'Mensagens', oracao: 'Oração', jornada: 'Jornada',
  perfil: 'Perfil', administracao: 'Administração',
};

const INTERACTION_LABELS: Record<string, string> = {
  mensagens: 'mensagens', oracoes: 'orações em sala', mural: 'comentários', intercessoes: 'intercessões',
};

function Avatar({ user }: { user: Pick<AdminUserKpi, 'nome' | 'foto_url'> }) {
  return user.foto_url
    ? <img src={user.foto_url} alt="" className="size-11 rounded-full object-cover ring-2 ring-[var(--accent-soft)]" />
    : <span className="grid size-11 place-items-center rounded-full bg-[var(--accent-soft)] font-display text-lg text-[var(--accent-primary)]">{user.nome.slice(0, 1).toUpperCase()}</span>;
}

export default function AdminUserInsights() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<AdminUserKpiReport | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReport(await getAdminUserKpis(period)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os indicadores.'); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { void load(); }, [load]);

  const users = useMemo(() => (report?.usuarios ?? []).filter(user => user.nome.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))), [query, report]);
  const totals = useMemo(() => (report?.usuarios ?? []).reduce((acc, user) => ({ access: acc.access + user.total_acessos, kesef: acc.kesef + user.kesef_saldo, active: acc.active + Number(user.total_acessos > 0), interactions: acc.interactions + user.interacoes.reduce((sum, item) => sum + item.total, 0) }), { access: 0, kesef: 0, active: 0, interactions: 0 }), [report]);

  return <div className="mx-auto max-w-6xl space-y-5 pb-4">
    <AdminPageHeader eyebrow="Pessoas · leitura protegida" title="Indicadores de usuários" description="Acompanhe circulação de Kesef, áreas utilizadas e vínculos de interação. Este painel mostra contagens — nunca o conteúdo de mensagens ou pedidos de oração." actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>} />

    <AdminMetricGrid>
      <AdminMetric label="Usuários com atividade" value={loading ? '—' : totals.active} Icon={UsersRound} tone="accent" />
      <AdminMetric label="Acessos no período" value={loading ? '—' : totals.access} Icon={Activity} tone="celebration" />
      <AdminMetric label="Kesef acumulado" value={loading ? '—' : <KesefAmount value={totals.kesef} />} Icon={Coins} tone="celebration" />
      <AdminMetric label="Interações registradas" value={loading ? '—' : totals.interactions} Icon={MessageCircleMore} tone="care" />
    </AdminMetricGrid>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Período dos indicadores">
        {([7,30,90] as const).map(value => <button key={value} onClick={() => setPeriod(value)} className={`min-h-9 rounded-lg px-4 text-xs font-semibold transition ${period === value ? 'bg-[var(--accent-primary)] text-[var(--on-accent)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>{value} dias</button>)}
      </div>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 sm:w-72"><Search size={16} className="txt-muted" /><span className="sr-only">Buscar usuário</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar usuário" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></label>
    </div>

    {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-400">{error}</div>}
    <AdminSection title="Leitura individual" description={`Dados agregados dos últimos ${period} dias. O saldo Kesef representa o total atual.`}>
      {loading ? <div className="card-surface p-10 text-center text-sm txt-muted">Consolidando indicadores…</div> : users.length === 0 ? <div className="card-surface p-10 text-center text-sm txt-muted">Nenhum usuário encontrado.</div> : <div className="grid gap-3 lg:grid-cols-2">
        {users.map(user => <article key={user.usuario_id} className="card-surface overflow-hidden p-4">
          <div className="flex items-center gap-3"><Avatar user={user} /><div className="min-w-0 flex-1"><h4 className="truncate font-display text-lg font-semibold text-[var(--text-primary)]">{user.nome}</h4><p className="text-[11px] text-[var(--text-muted)]">Último acesso {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'não registrado'}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Saldo</p><strong className="text-lg text-[var(--celebration)]"><KesefAmount value={user.kesef_saldo} /></strong></div></div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border)] rounded-xl bg-[var(--surface-elevated)] py-2 text-center"><div><strong className="block tabular-nums text-[var(--text-primary)]">{user.total_acessos}</strong><span className="text-[10px] text-[var(--text-muted)]">acessos</span></div><div><strong className="block tabular-nums text-[var(--accent-primary)]">+{user.kesef_recebido}</strong><span className="text-[10px] text-[var(--text-muted)]">Kesef recebido</span></div><div><strong className="block tabular-nums text-[var(--care)]">−{user.kesef_utilizado}</strong><span className="text-[10px] text-[var(--text-muted)]">Kesef usado</span></div></div>
          <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--text-muted)]">Áreas mais acessadas</p><div className="mt-2 flex flex-wrap gap-1.5">{user.areas.length ? user.areas.slice(0,5).map(area => <span key={area.area} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">{AREA_LABELS[area.area] ?? area.area} <strong className="text-[var(--text-primary)]">{area.acessos}</strong></span>) : <span className="text-xs text-[var(--text-muted)]">Ainda sem telemetria.</span>}</div></div>
          <div className="mt-4 border-t border-[var(--border)] pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--text-muted)]">Interage mais com</p><div className="mt-2 space-y-2">{user.interacoes.length ? user.interacoes.map(partner => <div key={partner.usuario_id} className="flex items-center gap-2"><span className="grid size-7 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-xs text-[var(--accent-primary)]">{partner.foto_url ? <img src={partner.foto_url} alt="" className="size-full object-cover" /> : partner.nome.slice(0,1)}</span><span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">{partner.nome}</span><span className="text-[10px] text-[var(--text-muted)]">{Object.entries(partner.tipos).map(([type,count]) => `${count} ${INTERACTION_LABELS[type] ?? type}`).join(' · ')}</span></div>) : <span className="text-xs text-[var(--text-muted)]">Sem interações no período.</span>}</div></div>
        </article>)}
      </div>}
    </AdminSection>
  </div>;
}
