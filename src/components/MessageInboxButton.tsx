import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { getCurrentUserId } from '../services/dataService';
import { getUltimasConversas, subscribeToInbox } from '../services/mensagemService';
import { ROUTES } from '../services/constants';
import SealIcon from './ui/SealIcon';

export default function MessageInboxButton() {
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;

    const atualizar = async () => {
      try {
        const [userId, conversas] = await Promise.all([getCurrentUserId(), getUltimasConversas()]);
        if (!ativo) return;
        setNaoLidas(conversas.reduce((total, conversa) => total + conversa.nao_lidas, 0));
        cancelar = subscribeToInbox(userId, () => {
          getUltimasConversas().then(atualizadas => {
            if (ativo) setNaoLidas(atualizadas.reduce((total, conversa) => total + conversa.nao_lidas, 0));
          }).catch(() => undefined);
        });
      } catch {
        // O indicador é complementar; não bloqueia a navegação principal.
      }
    };

    atualizar();
    return () => {
      ativo = false;
      cancelar?.();
    };
  }, []);

  const label = naoLidas > 0 ? `${naoLidas} mensagem(ns) não lida(s)` : 'Abrir mensagens';

  return (
    <Link
      to={ROUTES.MENSAGENS}
      aria-label={label}
      title={label}
      className="relative flex size-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-premium hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
    >
      <SealIcon Icon={MessageCircle} size="sm" />
      {naoLidas > 0 && (
        <span
          aria-label={`${naoLidas} não lida(s)`}
          className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--danger)] px-1 text-[9px] font-bold leading-4 text-white shadow-[0_0_8px_var(--danger)] animate-pulse"
        >
          {naoLidas > 99 ? '99+' : naoLidas}
        </span>
      )}
    </Link>
  );
}
