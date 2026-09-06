import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandHeart, RefreshCw, Search, ShieldCheck, UserRoundCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackState';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import { listPastoralPrayerRequests, savePastoralCare } from '../../services/pastoralService';
import type { PastoralCarePriority, PastoralCareStatus, PastoralCareType, PastoralPrayerRequest } from '../../types/admin';
import InstitutionalCrest from '../../components/InstitutionalCrest';
import { AdminPageHeader, AdminSection, AdminToolbar } from '../../components/admin/AdminPage';

const STATUS: Array<{ value: PastoralCareStatus; label: string }> = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_acolhimento', label: 'Em acolhimento' },
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'encaminhado', label: 'Encaminhado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'arquivado', label: 'Arquivado' },
];
const PRIORIDADES: Array<{ value: PastoralCarePriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' }, { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' }, { value: 'urgente', label: 'Urgente' },
];
const TIPOS: Array<{ value: PastoralCareType; label: string }> = [
  { value: 'oracao', label: 'Oração' }, { value: 'escuta', label: 'Escuta' },
  { value: 'visita', label: 'Visita' }, { value: 'assistencia', label: 'Ajuda assistencial' },
  { value: 'encaminhamento', label: 'Encaminhamento' },
];

function RequestCard({ request, canManage, onSaved }: { request: PastoralPrayerRequest; canManage: boolean; onSaved: () => void }) {
  const [status, setStatus] = useState(request.cuidado_status);
  const [priority, setPriority] = useState(request.prioridade);
  const [careType, setCareType] = useState(request.tipo_cuidado);
  const [notes, setNotes] = useState(request.observacoes ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (assignToMe = false) => {
    if (!canManage || saving) return;
    setSaving(true);
    try {
      await savePastoralCare({
        requestId: request.id,
        status: assignToMe && status === 'novo' ? 'em_acolhimento' : status,
        priority,
        careType,
        notes,
        assignToMe,
      });
      toast.success(assignToMe ? 'Pedido assumido para acolhimento' : 'Acompanhamento atualizado');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o cuidado pastoral.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--celebration)]">{request.categoria} · {request.acompanhamento.replace(/_/g, ' ')}</p>
          <h3 className="mt-1 flex items-center gap-2 font-display text-lg text-[var(--text-primary)]">{request.autor_nome}{request.autor_brasao_institucional && <InstitutionalCrest kind={request.autor_brasao_institucional} size={21} />}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(request.criado_em).toLocaleString('pt-BR')} · {request.total_intercessores} intercessor(es)</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide pastoral-priority--${priority}`}>{PRIORIDADES.find(item => item.value === priority)?.label}</span>
      </div>

      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {request.intencao || 'A pessoa pediu oração sem explicar o motivo.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">Situação
          <select className="input-theme min-h-11 w-full rounded-xl px-3 text-sm" value={status} onChange={event => setStatus(event.target.value as PastoralCareStatus)} disabled={!canManage || saving}>
            {STATUS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">Prioridade
          <select className="input-theme min-h-11 w-full rounded-xl px-3 text-sm" value={priority} onChange={event => setPriority(event.target.value as PastoralCarePriority)} disabled={!canManage || saving}>
            {PRIORIDADES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">Tipo de cuidado
          <select className="input-theme min-h-11 w-full rounded-xl px-3 text-sm" value={careType} onChange={event => setCareType(event.target.value as PastoralCareType)} disabled={!canManage || saving}>
            {TIPOS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">Registro confidencial
        <textarea className="input-theme min-h-24 w-full resize-y rounded-xl p-3 text-sm" maxLength={3000} value={notes} onChange={event => setNotes(event.target.value)} disabled={!canManage || saving} placeholder="Registre somente informações necessárias ao cuidado." />
      </label>

      {canManage && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => save(true)} disabled={saving}>
            <UserRoundCheck size={18} /> Acolher
          </Button>
          <Button onClick={() => save(false)} disabled={saving}>{saving ? 'Salvando…' : 'Salvar cuidado'}</Button>
        </div>
      )}
      {request.responsavel_nome && <p className="text-xs text-[var(--text-muted)]">Responsável: <strong className="text-[var(--text-secondary)]">{request.responsavel_nome}</strong></p>}
    </Card>
  );
}

export default function AdminPastoral() {
  const [requests, setRequests] = useState<PastoralPrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ativos' | PastoralCareStatus>('ativos');
  const { can } = useAdmin();
  const canManage = can('pastoral.manage');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRequests(await listPastoralPrayerRequests()); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a fila pastoral.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => requests.filter(request => {
    if (filter === 'ativos' && ['concluido', 'arquivado'].includes(request.cuidado_status)) return false;
    if (filter !== 'ativos' && request.cuidado_status !== filter) return false;
    const term = query.trim().toLowerCase();
    return !term || `${request.autor_nome} ${request.intencao ?? ''} ${request.categoria}`.toLowerCase().includes(term);
  }), [filter, query, requests]);

  if (loading && !requests.length) return <LoadingState label="Organizando a fila de cuidado…" />;
  if (error && !requests.length) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Cuidado confidencial" title="Acompanhamento pastoral" description="Triagem de intercessões, acolhimento e necessidades assistenciais." actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>} />

      <AdminToolbar>
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 text-[var(--text-muted)]" size={17} /><input className="input-theme min-h-11 w-full rounded-xl pl-10 pr-3 text-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pessoa, assunto ou intenção" /></label>
        <select className="input-theme min-h-11 rounded-xl px-3 text-sm" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="ativos">Cuidados ativos</option>{STATUS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      </AdminToolbar>

      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)]"><ShieldCheck size={17} className="text-[var(--accent-primary)]" /> Registros desta área são restritos a funções pastorais autorizadas.</div>

      <AdminSection title="Fila de cuidado" description={`${filtered.length} pedido(s) no filtro atual.`}>
        {filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map(request => <RequestCard key={request.id} request={request} canManage={canManage} onSaved={load} />)}</div> : <EmptyState Icon={HandHeart} title="Nenhum pedido nesta etapa" description="Novos pedidos compatíveis com o filtro aparecerão aqui." />}
      </AdminSection>
    </div>
  );
}
