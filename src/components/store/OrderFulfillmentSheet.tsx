import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MapPin, MessageCircleMore, PackageCheck, X } from 'lucide-react';
import type { LojaEtapaLogistica, LojaPedido } from '../../types';
import type { LojaLogisticaInput } from '../../services/storeService';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

type Mode = 'approve' | 'update';

interface Props {
  pedido: LojaPedido;
  mode: Mode;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: LojaLogisticaInput) => Promise<void>;
}

const OPTIONS: Array<{ etapa: LojaEtapaLogistica; title: string; description: string; Icon: typeof PackageCheck }> = [
  { etapa: 'previsao_pendente', title: 'Previsão em definição', description: 'Confirma o processamento e avisa que a previsão de entrega virá em breve.', Icon: PackageCheck },
  { etapa: 'agendado', title: 'Entrega agendada', description: 'Informa data, horário e local definidos para o membro.', Icon: CalendarClock },
  { etapa: 'alinhamento_retirada', title: 'Alinhamento de retirada', description: 'O gestor combinará posteriormente data e local com o membro.', Icon: MessageCircleMore },
];

function toLocalInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OrderFulfillmentSheet({ pedido, mode, busy, onClose, onSubmit }: Props) {
  const [etapa, setEtapa] = useState<LojaEtapaLogistica>(pedido.etapa_logistica ?? 'previsao_pendente');
  const [agendamento, setAgendamento] = useState(toLocalInputValue(pedido.entrega_agendada_em));
  const [local, setLocal] = useState(pedido.entrega_local ?? '');
  const [instrucoes, setInstrucoes] = useState(pedido.instrucoes_retirada ?? '');
  const [erro, setErro] = useState('');
  const title = mode === 'approve' ? 'Processar resgate' : 'Atualizar entrega';
  const preview = useMemo(() => {
    if (etapa === 'agendado' && agendamento && local.trim()) {
      return `Seu resgate foi agendado para ${new Date(agendamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} no ${local.trim()}.`;
    }
    if (etapa === 'alinhamento_retirada') return 'Seu resgate foi processado. O Gestor do Tesouro alinhará com você a data e o local de retirada.';
    return 'Seu pedido foi processado. Em breve você receberá uma previsão de entrega.';
  }, [agendamento, etapa, local]);

  const submit = async () => {
    if (etapa === 'agendado' && (!agendamento || !local.trim())) {
      setErro('Informe data, horário e local para o resgate agendado.');
      return;
    }
    if (instrucoes.trim().length > 600) {
      setErro('As instruções podem ter no máximo 600 caracteres.');
      return;
    }
    setErro('');
    await onSubmit({
      etapa,
      entregaAgendadaEm: etapa === 'agendado' ? new Date(agendamento).toISOString() : null,
      entregaLocal: etapa === 'agendado' ? local.trim() : null,
      instrucoes: instrucoes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="logistica-pedido-title" className="glass-strong flex max-h-[calc(var(--app-viewport-height)-var(--safe-area-top)-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--border)] shadow-2xl sm:max-h-[min(44rem,calc(var(--app-viewport-height)-3rem))] sm:rounded-[1.75rem]" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Tesouro · logística</p>
            <h2 id="logistica-pedido-title" className="mt-1 font-display text-xl font-semibold txt-primary">{title}</h2>
            <p className="mt-0.5 text-xs txt-tertiary">{pedido.item?.nome || 'Resgate'} · {pedido.usuario?.nome || 'Membro'}</p>
          </div>
          <IconButton onClick={onClose} label="Fechar logística" disabled={busy}><X size={18} /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Próxima etapa para o membro</p>
            <div className="mt-2 grid gap-2">
              {OPTIONS.map(option => {
                const Icon = option.Icon;
                const active = etapa === option.etapa;
                return (
                  <button key={option.etapa} type="button" aria-pressed={active} onClick={() => { setEtapa(option.etapa); setErro(''); }} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-[var(--surface)] text-[var(--accent-primary)]' : 'bg-[var(--surface-elevated)] txt-muted'}`}><Icon size={18} /></span>
                    <span><strong className="block text-sm txt-primary">{option.title}</strong><span className="mt-0.5 block text-[11px] leading-relaxed txt-tertiary">{option.description}</span></span>
                  </button>
                );
              })}
            </div>
          </div>

          {etapa === 'agendado' && (
            <div className="grid gap-3 rounded-2xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-4 sm:grid-cols-2">
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Data e horário</span><input type="datetime-local" value={agendamento} onChange={event => setAgendamento(event.target.value)} className="input-theme mt-1.5 min-h-11 w-full rounded-xl px-3 text-sm outline-none" /></label>
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Local</span><span className="input-theme mt-1.5 flex min-h-11 items-center gap-2 rounded-xl px-3"><MapPin size={15} className="txt-muted" /><input value={local} onChange={event => setLocal(event.target.value)} maxLength={160} className="min-w-0 flex-1 bg-transparent text-sm outline-none txt-primary" placeholder="Ex.: Salão da igreja" /></span></label>
            </div>
          )}

          <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Orientação complementar <span className="normal-case tracking-normal txt-muted">(opcional)</span></span><textarea value={instrucoes} onChange={event => setInstrucoes(event.target.value)} maxLength={600} className="input-theme mt-1.5 min-h-20 w-full resize-none rounded-xl px-3 py-3 text-sm outline-none" placeholder="Ex.: procure a equipe após o culto." /></label>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--celebration)]">Mensagem para o membro</p><p className="mt-1.5 text-sm leading-relaxed txt-secondary">{preview}{instrucoes.trim() ? ` ${instrucoes.trim()}` : ''}</p></div>
          {erro && <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-[var(--danger)]">{erro}</p>}
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-[max(1rem,var(--safe-area-bottom))] pt-4 sm:px-6 sm:pb-4">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button className="flex-1" onClick={submit} disabled={busy}><CheckCircle2 size={17} />{busy ? 'Salvando...' : mode === 'approve' ? 'Processar e avisar' : 'Atualizar e avisar'}</Button>
        </footer>
      </section>
    </div>
  );
}
