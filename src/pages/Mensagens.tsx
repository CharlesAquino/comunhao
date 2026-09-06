import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageCircle, Search } from 'lucide-react';
import { corAvatar, corTextoAvatar } from '../utils/avatarColor';
import Card from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/FeedbackState';
import { getCurrentUserId } from '../services/dataService';
import { ROUTES } from '../services/constants';
import { getUltimasConversas, subscribeToInbox, type ConversaResumo } from '../services/mensagemService';
import InstitutionalCrest from '../components/InstitutionalCrest';
import type { InstitutionalCrestKind } from '../services/institutionalCrestRules';
import AppBrandMark from '../components/ui/AppBrandMark';

function formatarMomento(dataIso: string): string {
  const data = new Date(dataIso);
  const agora = new Date();
  const mesmoDia = data.toDateString() === agora.toDateString();

  if (mesmoDia) {
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getIniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0]?.toUpperCase() ?? '')
    .join('');
}

function AvatarMensagem({ nome, fotoUrl, brasao }: { nome: string; fotoUrl?: string | null; brasao?: InstitutionalCrestKind | null }) {
  return (
    <span className="relative shrink-0">
      {fotoUrl
        ? <img src={fotoUrl} alt={nome} className="size-12 rounded-full border border-[var(--accent-border)] object-cover" />
        : <span className="flex size-12 items-center justify-center rounded-full border border-[var(--accent-border)] font-semibold" style={{ backgroundColor: corAvatar(nome), color: corTextoAvatar() }}>{getIniciais(nome)}</span>}
      {brasao && <span className="absolute -bottom-1.5 -right-2"><InstitutionalCrest kind={brasao} size={22} /></span>}
    </span>
  );
}

export default function Mensagens() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);

  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;

    const carregar = async () => {
      try {
        const [userId, lista] = await Promise.all([getCurrentUserId(), getUltimasConversas()]);
        if (!ativo) return;
        setConversas(lista);
        setErro('');
        cancelar = subscribeToInbox(userId, () => {
          getUltimasConversas().then(atualizadas => {
            if (ativo) setConversas(atualizadas);
          }).catch(() => undefined);
        });
      } catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar suas conversas.');
      } finally {
        if (ativo) setLoading(false);
      }
    };

    carregar();
    return () => {
      ativo = false;
      cancelar?.();
    };
  }, []);

  const termo = busca.trim().toLowerCase();
  const conversasFiltradas = termo.length === 0
    ? conversas
    : conversas.filter(conversa =>
        conversa.parceiro_nome.toLowerCase().includes(termo)
        || conversa.ultima_mensagem.toLowerCase().includes(termo),
      );

  const totalNaoLidas = conversas.reduce((total, conversa) => total + conversa.nao_lidas, 0);

  if (loading) return <LoadingState label="Carregando mensagens..." />;
  if (erro) return <ErrorState message={erro} />;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-6 pt-6 sm:px-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppBrandMark />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Comunicação</p>
              <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Mensagens</h1>
            </div>
          </div>
          {totalNaoLidas > 0 && (
            <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-primary)]">
              {totalNaoLidas} nova{totalNaoLidas > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <Card className="p-3">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            value={busca}
            onChange={event => setBusca(event.target.value)}
            placeholder="Buscar conversa"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
      </Card>

      <Card className="overflow-hidden p-0">
        {conversasFiltradas.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
              <MessageCircle size={24} />
            </span>
            <h2 className="mt-4 font-display text-lg text-[var(--text-primary)]">
              {conversas.length === 0 ? 'Nenhuma conversa iniciada' : 'Nenhuma conversa encontrada'}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {conversas.length === 0
                ? 'As conversas aparecerão aqui quando você começar a falar com alguém da comunidade.'
                : 'Ajuste a busca para localizar outra conversa.'}
            </p>
            {conversas.length === 0 && (
              <Link
                to={ROUTES.COMUNIDADE}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--accent-primary)]"
              >
                Ir para a comunidade <ChevronRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {conversasFiltradas.map(conversa => (
              <Link
                key={conversa.parceiro_id}
                to={`/chat/${conversa.parceiro_id}`}
                className={`flex min-h-20 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)] sm:px-5 ${
                  conversa.nao_lidas > 0 ? 'bg-[color-mix(in_srgb,var(--accent-soft)_55%,transparent)]' : ''
                }`}
              >
                <AvatarMensagem nome={conversa.parceiro_nome} fotoUrl={conversa.parceiro_foto_url} brasao={conversa.parceiro_brasao_institucional} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {conversa.parceiro_nome}
                    </span>
                    {conversa.nao_lidas > 0 && (
                      <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-on-accent)]">
                        {conversa.nao_lidas}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-sm text-[var(--text-secondary)]">
                    {conversa.ultima_mensagem}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[var(--text-muted)]">
                  {formatarMomento(conversa.criado_em)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
