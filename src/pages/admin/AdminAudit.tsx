import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { listAdminAudit } from '../../services/adminAccessService';
import type { AdminAuditRecord } from '../../types/admin';
import Button from '../../components/ui/Button';
import { AdminPageHeader, AdminSection } from '../../components/admin/AdminPage';

export default function AdminAudit() {
  const [records, setRecords] = useState<AdminAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await listAdminAudit());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Governança" title="Auditoria administrativa" description="Registro imutável das ações realizadas por operadores." actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>} />

      {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}

      <AdminSection title="Registros recentes" description="Ações ordenadas da mais recente para a mais antiga.">
      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm txt-muted">Carregando registros…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm txt-muted">Nenhuma ação auditada ainda.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {records.map(record => (
              <article key={record.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {record.status === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-rose-400" />}
                    <span className="text-sm font-semibold txt-primary">{record.action}</span>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] txt-muted">{record.entity_type}</span>
                  </div>
                  <p className="mt-1 text-xs txt-tertiary">
                    {record.actor_name ?? 'Operador'} · {record.permission}
                    {record.reason ? ` · ${record.reason}` : ''}
                  </p>
                  {record.error_message && <p className="mt-1 text-xs text-rose-300">{record.error_message}</p>}
                </div>
                <time className="text-xs tabular-nums txt-muted" dateTime={record.created_at}>
                  {new Date(record.created_at).toLocaleString('pt-BR')}
                </time>
              </article>
            ))}
          </div>
        )}
      </div>
      </AdminSection>
    </div>
  );
}
