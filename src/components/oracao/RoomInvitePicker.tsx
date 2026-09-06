import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X } from 'lucide-react';
import type { AvailablePrayerPerson } from '../../services/prayerAvailabilityService';
import Button from '../ui/Button';

interface RoomInvitePickerProps {
  open: boolean;
  people: AvailablePrayerPerson[];
  loading: boolean;
  participantIds: string[];
  onClose: () => void;
  onInvite: (person: AvailablePrayerPerson) => Promise<void>;
}

export default function RoomInvitePicker({ open, people, loading, participantIds, onClose, onInvite }: RoomInvitePickerProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  useEffect(() => { if (!open) setSendingId(null); }, [open]);
  if (!open) return null;
  const available = people.filter(person => !participantIds.includes(person.usuario_id));

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="room-invite-title" className="max-h-[min(42rem,86dvh)] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--celebration)]">Sala de Oração</p><h2 id="room-invite-title" className="mt-1 font-display text-2xl txt-primary">Convidar alguém</h2><p className="mt-1 text-sm txt-tertiary">A pessoa entrará nesta mesma sala depois de aceitar.</p></div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] txt-secondary"><X size={19} /></button>
        </header>
        <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-4">
          {loading ? <p className="p-6 text-center text-sm txt-tertiary">Buscando pessoas disponíveis…</p> : available.length === 0 ? <p className="p-6 text-center text-sm txt-tertiary">Não há outras pessoas disponíveis agora.</p> : available.map(person => (
            <div key={person.usuario_id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)]">{person.foto_url ? <img src={person.foto_url} alt="" className="size-full object-cover" /> : <strong>{person.nome[0]}</strong>}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold txt-primary">{person.nome}</p><p className="text-xs txt-tertiary">{person.modalidades.join(', ')}</p></div>
              <Button variant="secondary" disabled={sendingId !== null} onClick={async () => { setSendingId(person.usuario_id); try { await onInvite(person); } finally { setSendingId(null); } }} className="!px-3"><UserPlus size={16} />{sendingId === person.usuario_id ? 'Enviando…' : 'Convidar'}</Button>
            </div>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
