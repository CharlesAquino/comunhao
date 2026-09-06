import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, RefreshCw, Search, ShieldCheck, UserMinus, UserRoundCog, UsersRound, X } from 'lucide-react';
import { getMetricasEngajamento } from '../../services/dataService';
import { assignAdminRole, listAdminRoleAssignments, removeAdminRole } from '../../services/adminAccessService';
import { listarValidacoesMembros, validarMembroIndicado, type MemberValidation } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import type { EngajamentoJovem } from '../../types';
import type { AdminRoleAssignment, AdminRoleCode } from '../../types/admin';
import InstitutionalCrest from '../../components/InstitutionalCrest';
import { resolveInstitutionalCrest } from '../../services/institutionalCrestRules';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import { AdminPageHeader, AdminSection, AdminToolbar, KesefAmount } from '../../components/admin/AdminPage';

const ROLE_OPTIONS: Array<{ code: AdminRoleCode; label: string }> = [
  { code: 'administrador', label: 'Administrador' },
  { code: 'guardiao', label: 'Guardião' },
  { code: 'editor_ebd', label: 'Editor EBD' },
  { code: 'revisor_ebd', label: 'Revisor EBD' },
  { code: 'operador_loja', label: 'Operador da Loja e Cantina' },
  { code: 'gestor_cantina', label: 'Gestor da Cantina' },
  { code: 'operador_cantina', label: 'Operador da Cantina (legado)' },
  { code: 'pastoral', label: 'Responsável pastoral' },
  { code: 'tecnico', label: 'Operador técnico' },
];

const SEMAFORO_META = {
  verde: { label: 'Ativos', description: 'presença recente', Icon: Activity, tone: 'text-[var(--accent-primary)] bg-[var(--accent-soft)] border-[var(--accent-border)]', className: 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-border)]' },
  amarelo: { label: 'Em atenção', description: 'pedem contato', Icon: Clock3, tone: 'text-[var(--celebration)] bg-[var(--celebration-soft)] border-[var(--celebration-border)]', className: 'bg-[var(--celebration-soft)] text-[var(--celebration)] border-[var(--celebration-border)]' },
  vermelho: { label: 'Afastados', description: 'sem acesso recente', Icon: UserMinus, tone: 'text-[var(--care)] bg-[var(--care-soft)] border-[var(--care-border)]', className: 'bg-[var(--care-soft)] text-[var(--care)] border-[var(--care-border)]' },
} as const;

export default function AdminPeople() {
  const [people, setPeople] = useState<EngajamentoJovem[]>([]);
  const [assignments, setAssignments] = useState<AdminRoleAssignment[]>([]);
  const [validations, setValidations] = useState<MemberValidation[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | EngajamentoJovem['semafaro']>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EngajamentoJovem | null>(null);
  const [role, setRole] = useState<AdminRoleCode>('guardiao');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { can, userId, refreshRole } = useAdmin();
  const toast = useToast();
  const canManageRoles = can('people.roles');
  const canManagePeople = can('people.manage');
  const canSeeSensitive = can('people.sensitive');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [peopleData, assignmentData, validationData] = await Promise.all([
        getMetricasEngajamento(),
        canManageRoles ? listAdminRoleAssignments() : Promise.resolve([]),
        canManagePeople ? listarValidacoesMembros() : Promise.resolve([]),
      ]);
      setPeople(peopleData);
      setAssignments(assignmentData);
      setValidations(validationData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as pessoas.');
    } finally {
      setLoading(false);
    }
  }, [canManagePeople, canManageRoles]);

  useEffect(() => { void load(); }, [load]);

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, AdminRoleAssignment[]>();
    for (const assignment of assignments) {
      const list = map.get(assignment.usuario_id) ?? [];
      list.push(assignment);
      map.set(assignment.usuario_id, list);
    }
    return map;
  }, [assignments]);

  const validationsByUser = useMemo(
    () => new Map(validations.map(validation => [validation.usuario_id, validation])),
    [validations],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return people.filter(person => {
      if (status !== 'todos' && person.semafaro !== status) return false;
      if (!term) return true;
      return person.nome.toLocaleLowerCase('pt-BR').includes(term)
        || person.papel?.toLocaleLowerCase('pt-BR').includes(term)
        || (canSeeSensitive && person.telefone?.includes(term));
    });
  }, [canSeeSensitive, people, search, status]);

  const closeManager = () => {
    setSelected(null);
    setReason('');
    setRole('guardiao');
  };

  const assignRole = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await assignAdminRole(selected.id, role, reason);
      toast.success('Papel administrativo atribuído.');
      await load();
      if (selected.id === userId) await refreshRole();
      setReason('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível atribuir o papel.';
      toast.error(message.includes('SELF_ROLE_ASSIGNMENT_DENIED')
        ? 'Você não pode atribuir um papel administrativo a si mesmo.'
        : message.includes('RATE_LIMITED')
          ? 'Muitas alterações em sequência. Aguarde um minuto e tente novamente.'
          : message.includes('ADMIN_PERMISSION_REQUIRED')
            ? 'Seu acesso não permite nomear operadores.'
            : message.includes('REASON_REQUIRED')
              ? 'Informe um motivo com pelo menos 8 caracteres.'
              : message);
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (roleCode: AdminRoleCode) => {
    if (!selected || saving) return;
    if (reason.trim().length < 5) {
      toast.error('Informe o motivo antes de remover um papel.');
      return;
    }
    setSaving(true);
    try {
      await removeAdminRole(selected.id, roleCode, reason);
      toast.success('Papel administrativo removido.');
      await load();
      if (selected.id === userId) await refreshRole();
      setReason('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível remover o papel.';
      toast.error(message.includes('SELF_ADMIN_REMOVAL_DENIED')
        ? 'Você não pode remover de si mesmo o papel de administrador.'
        : message.includes('RATE_LIMITED')
          ? 'Muitas alterações em sequência. Aguarde um minuto e tente novamente.'
          : message.includes('REASON_REQUIRED')
            ? 'Informe um motivo com pelo menos 8 caracteres.'
            : message);
    } finally {
      setSaving(false);
    }
  };

  const validateMember = async () => {
    if (!selected || saving) return;
    if (reason.trim().length < 5) {
      toast.error('Informe o motivo da validação.');
      return;
    }
    setSaving(true);
    try {
      await validarMembroIndicado(selected.id, reason);
      toast.success('Membro validado. O bônus de indicação foi processado.');
      await load();
      closeManager();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível validar o membro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Supervisão" title="Pessoas e acessos" description="Acompanhe atividade, pontos e papéis administrativos." actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>} />

      <section className="card-surface overflow-hidden" aria-labelledby="people-pulse-title">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
              <UsersRound size={21} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p id="people-pulse-title" className="font-display text-lg font-semibold leading-tight text-[var(--text-primary)]">Pulso da comunidade</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Atividade e necessidade de acompanhamento</p>
            </div>
          </div>
          <button type="button" onClick={() => setStatus('todos')} aria-pressed={status === 'todos'} className={`shrink-0 rounded-2xl border px-3 py-2 text-right transition ${status === 'todos' ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`}>
            <span className="block font-display text-2xl font-semibold leading-none text-[var(--text-primary)]">{people.length}</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">pessoas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {(['verde', 'amarelo', 'vermelho'] as const).map(key => {
            const meta = SEMAFORO_META[key];
            const count = people.filter(person => person.semafaro === key).length;
            const selectedFilter = status === key;
            return (
              <button key={key} type="button" onClick={() => setStatus(selectedFilter ? 'todos' : key)} aria-pressed={selectedFilter} className={`group flex min-h-[82px] items-center gap-3 px-4 py-3 text-left transition-colors ${selectedFilter ? 'bg-[var(--surface-highlighted)]' : 'hover:bg-[var(--surface-elevated)]'}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-2xl border ${meta.tone}`}><meta.Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <strong className="truncate text-xs font-semibold text-[var(--text-primary)]">{meta.label}</strong>
                    <span className="font-display text-2xl font-semibold leading-none text-[var(--text-primary)]">{count}</span>
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{meta.description}</span>
                  <span className={`mt-2 block h-0.5 rounded-full transition-opacity ${selectedFilter ? 'bg-current opacity-100' : 'opacity-0'} ${key === 'verde' ? 'text-[var(--accent-primary)]' : key === 'amarelo' ? 'text-[var(--celebration)]' : 'text-[var(--care)]'}`} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <AdminToolbar><div className="relative flex-1">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 txt-muted" />
        <input value={search} onChange={event => setSearch(event.target.value)} className="input-theme min-h-12 w-full rounded-xl pl-11 pr-4 text-sm" placeholder="Buscar por nome, papel ou telefone" />
      </div></AdminToolbar>

      {error && <div className="rounded-xl border border-[var(--care-border)] bg-[var(--care-soft)] p-4 text-sm text-[var(--care)]">{error}</div>}

      {loading ? (
        <div className="card-surface p-8 text-center text-sm txt-muted">Carregando pessoas…</div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm txt-muted">Nenhuma pessoa encontrada.</div>
      ) : (
        <AdminSection title="Pessoas" description={`${filtered.length} perfil(is) no filtro atual.`}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(person => {
            const personAssignments = assignmentsByUser.get(person.id) ?? [];
            const memberValidation = validationsByUser.get(person.id);
            const institutionalCrest = resolveInstitutionalCrest(personAssignments.map(item => item.role_code), person.papel ?? 'membro');
            return (
              <article key={person.id} className="card-surface elevation-1 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {person.foto_url ? (
                      <img src={person.foto_url} alt="" className="size-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-bold txt-green">{person.nome.slice(0, 1).toUpperCase()}</div>
                    )}
                    {institutionalCrest && <span className="absolute -bottom-1.5 -right-2"><InstitutionalCrest kind={institutionalCrest} size={23} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold txt-primary">{person.nome}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${SEMAFORO_META[person.semafaro].className}`}>{SEMAFORO_META[person.semafaro].label}</span>
                      {memberValidation && <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] txt-green">Validado</span>}
                    </div>
                    <p className="mt-1 text-xs txt-tertiary">{person.dias_sem_login >= 999 ? 'Sem acesso registrado' : `${person.dias_sem_login} dia(s) sem acessar`}</p>
                    {canSeeSensitive && person.telefone && <p className="mt-1 text-xs txt-muted">{person.telefone}</p>}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[var(--surface-elevated)] p-2"><span className="block text-sm font-bold txt-primary">{person.pontos_comunhao}</span><span className="text-[10px] txt-muted">pontos</span></div>
                  <div className="rounded-xl bg-[var(--surface-elevated)] p-2"><span className="block text-sm font-bold txt-primary">{person.streak_dias ?? 0}</span><span className="text-[10px] txt-muted">sequência</span></div>
                  <div className="rounded-xl bg-[var(--surface-elevated)] p-2"><span className="block text-sm font-bold txt-primary">{person.participa_sorteio ? 'Sim' : 'Não'}</span><span className="text-[10px] txt-muted">sorteio</span></div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {person.papel && <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] txt-tertiary">Legado: {person.papel}</span>}
                  {personAssignments.map(assignment => <span key={assignment.id} className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-1 text-[10px] txt-green">{assignment.role_code}</span>)}
                </div>

                {(canManageRoles || canManagePeople) && (
                  <Button type="button" variant="secondary" onClick={() => setSelected(person)} className="mt-4 w-full">
                    <UserRoundCog size={16} /> Gerenciar pessoa
                  </Button>
                )}
              </article>
            );
          })}
        </div></AdminSection>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onClick={closeManager}>
          <section className="w-full max-w-lg rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] sm:rounded-3xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] txt-green">Acesso administrativo</p><h3 className="mt-1 font-display text-xl txt-primary">{selected.nome}</h3></div>
              <IconButton label="Fechar gerenciamento" onClick={closeManager}><X size={18} /></IconButton>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold txt-tertiary">Motivo obrigatório · mínimo de 8 caracteres</span><textarea value={reason} onChange={event => setReason(event.target.value)} className="input-theme min-h-24 w-full resize-none rounded-xl p-3 text-sm" placeholder="Ex.: responsável pela operação da Cantina" /></label>

              {canManagePeople && (
                validationsByUser.has(selected.id) ? (
                  <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-sm txt-green">Membro validado · bônus de <KesefAmount value={validationsByUser.get(selected.id)?.bonus_quantidade ?? 0} className="font-semibold" /> processado</div>
                ) : (
                  <Button type="button" onClick={validateMember} disabled={saving || reason.trim().length < 5} className="min-h-12 w-full"><ShieldCheck size={17} /> Validar membro</Button>
                )
              )}

              {canManageRoles && (
                <>
                  <label className="block"><span className="mb-1 block text-xs font-semibold txt-tertiary">Novo papel administrativo</span><select value={role} onChange={event => setRole(event.target.value as AdminRoleCode)} className="input-theme min-h-12 w-full rounded-xl px-3">{ROLE_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
                  <Button type="button" variant="secondary" onClick={assignRole} disabled={saving || reason.trim().length < 8} className="min-h-12 w-full"><UserRoundCog size={17} /> Nomear responsável</Button>
                </>
              )}
            </div>

            {(assignmentsByUser.get(selected.id) ?? []).length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] txt-muted">Papéis ativos</p>
                <div className="space-y-2">{(assignmentsByUser.get(selected.id) ?? []).map(assignment => <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-3"><span className="text-sm font-semibold txt-primary">{assignment.role_code}</span><Button type="button" variant="danger" onClick={() => removeRole(assignment.role_code)} disabled={saving || reason.trim().length < 8} className="!min-h-9 !px-3 text-xs">Remover</Button></div>)}</div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
