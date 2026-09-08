import { Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../services/constants';
import type { MocidadeGridProps } from '../types';
import AvatarComEmblema from './AvatarComEmblema';

interface MocidadeGridExtendedProps extends MocidadeGridProps {
  compact?: boolean;
  sessoesAbertas?: Record<string, string>;
  onJuntarSessao?: (sessaoId: string, anfitriaoNome: string) => void;
}

export default function MocidadeGrid({ compact = false, jovens = [], sessoesAbertas = {}, onJuntarSessao }: MocidadeGridExtendedProps) {
  const disponiveis = jovens.filter(jovem => jovem.status_anel === 'disponivel').length;
  return (
    <section className="community-presence" aria-labelledby={compact ? undefined : "community-presence-title"} aria-label={compact ? "Membros da comunidade" : undefined}>
      {!compact && <div className="community-presence__header">
        <div>
          <span className="community-presence__kicker">Saguão de oração</span>
          <h3 id="community-presence-title">A Mocidade</h3>
        </div>
        <div className="community-presence__status" aria-label={`${disponiveis} ${disponiveis === 1 ? 'pessoa disponível' : 'pessoas disponíveis'}`}>
          <span className="community-presence__pulse" aria-hidden="true" />
          <strong>{disponiveis}</strong>
          <span>{disponiveis === 1 ? 'disponível' : 'disponíveis'}</span>
        </div>
      </div>}
      {jovens.length === 0 ? (
        <div className="premium-surface rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhum membro para mostrar agora.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Os membros da comunidade aparecerão aqui.</p>
        </div>
      ) : (
        <div
          className="community-presence__rail presence-carousel scrollbar-hidden"
          role="list"
          aria-label={`${jovens.length} membros da comunidade. Deslize para ver mais.`}
        >
        {jovens.map((jovem) => {
          const sessaoId = sessoesAbertas[jovem.id];
          const temMaoLevantada = !!sessaoId;

          const perfil = (
            <>
              <div className="relative">
                <AvatarComEmblema
                  nome={jovem.nome}
                  fotoUrl={jovem.avatar ?? null}
                  statusAnel={jovem.status_anel}
                  xp={jovem.xp}
                  brasaoInstitucional={jovem.brasaoInstitucional}
                />
                {temMaoLevantada && (
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(217,172,92,0.5)] bg-amber-500 border border-amber-300/50">
                    <Hand size={10} className="text-white" />
                  </div>
                )}
              </div>
              <span className="line-clamp-2 min-h-7 w-full break-words text-center text-xs font-medium leading-tight txt-tertiary">
                {jovem.nome}
              </span>
            </>
          );

          return (
            <div key={jovem.id} className="community-presence__person" role="listitem">
              <Link
                to={ROUTES.PERFIL_USUARIO(jovem.id)}
                aria-label={`Abrir perfil de ${jovem.nome}`}
                className="community-presence__profile"
              >
                {perfil}
              </Link>
              {temMaoLevantada && (
                <button
                  type="button"
                  onClick={() => {
                    if (sessaoId && onJuntarSessao) onJuntarSessao(sessaoId, jovem.nome);
                  }}
                  className="community-presence__join"
                  aria-label={`Juntar-se à oração de ${jovem.nome}`}
                >
                  Orar junto
                </button>
              )}
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}
