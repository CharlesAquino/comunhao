import { Bell, BookOpen, Hand, MessageCircle } from 'lucide-react';
import type { AppNotification } from '../services/notificationService';
import {
  obterApresentacaoAtividade,
  type AcaoAtividade,
  type CategoriaAtividade,
} from '../services/notificationActivity';

interface NotificationActivityCardProps {
  notificacao: AppNotification;
  tempo: string;
  acaoProcessando?: AcaoAtividade | null;
  onAbrir: (notificacao: AppNotification) => void | Promise<void>;
  onAcao: (
    notificacao: AppNotification,
    acao: AcaoAtividade,
  ) => void | Promise<void>;
}

function IconeCategoria({
  categoria,
}: {
  categoria: CategoriaAtividade;
}) {
  if (categoria === 'oracoes') return <Hand size={15} />;
  if (categoria === 'mural') return <MessageCircle size={15} />;
  if (categoria === 'ebd') return <BookOpen size={15} />;

  return <Bell size={15} />;
}

export default function NotificationActivityCard({
  notificacao,
  tempo,
  acaoProcessando = null,
  onAbrir,
  onAcao,
}: NotificationActivityCardProps) {
  const apresentacao = obterApresentacaoAtividade(notificacao);
  const processando = acaoProcessando === apresentacao.acao.id;

  return (
    <article
      className={`border-b border-[var(--border)] px-4 py-3 last:border-b-0 hover:bg-[var(--surface-elevated)] ${
        notificacao.lida ? 'opacity-70' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => void onAbrir(notificacao)}
        className="block w-full text-left"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            <IconeCategoria categoria={apresentacao.categoria} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold txt-primary">
                {notificacao.titulo}
              </span>

              {!notificacao.lida && (
                <span className="size-2 shrink-0 rounded-full bg-[var(--accent-solid)]" />
              )}
            </span>

            <span className="mt-0.5 block text-xs leading-relaxed txt-secondary">
              {notificacao.corpo}
            </span>

            <span className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide txt-tertiary">
                {apresentacao.etiqueta}
              </span>

              <span className="text-[10px] txt-muted">{tempo}</span>
            </span>
          </span>
        </div>
      </button>

      <div className="ml-11 mt-2">
        <button
          type="button"
          disabled={acaoProcessando !== null}
          onClick={() =>
            void onAcao(notificacao, apresentacao.acao.id)
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--accent-primary)] disabled:cursor-wait disabled:opacity-60"
        >
          <IconeCategoria categoria={apresentacao.categoria} />
          {processando ? 'Abrindo...' : apresentacao.acao.label}
        </button>
      </div>
    </article>
  );
}
