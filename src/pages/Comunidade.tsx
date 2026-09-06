import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { getDashboardData, subscribeToDataChanges } from '../services/dataService';
import { calcularPatente } from '../services/patente';
import { ROUTES } from '../services/constants';
import type { DashboardData } from '../types';
import AvatarComEmblema from '../components/AvatarComEmblema';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/FeedbackState';
import ProfileCoverBackground from '../components/profile/ProfileCoverBackground';
import { getProfileCover } from '../services/profileCovers';

export default function Comunidade() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const carregar = useCallback(async () => {
    try {
      setData(await getDashboardData());
      setErro('');
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_AUTHENTICATED') navigate(ROUTES.LOGIN);
      else setErro(error instanceof Error ? error.message : 'Não foi possível carregar a comunidade.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    carregar();
    return subscribeToDataChanges(carregar);
  }, [carregar]);

  if (loading) return <LoadingState label="Reunindo a comunidade..." />;
  if (erro) return <ErrorState message={erro} />;

  const jovens = data?.mocidade ?? [];

  return (
    <div className="space-y-6 px-5 pb-5 pt-6">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">Sala de Oração</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Comunidade</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Ninguém ora sozinho. Encontre sua mocidade por aqui.</p>
      </header>

      <section className="space-y-3">
        <SectionHeader title="Mocidade" eyebrow={`${jovens.length} membros`} />
        {jovens.length === 0 ? (
          <EmptyState Icon={Users} title="A comunidade aparecerá aqui" description="Quando houver membros disponíveis, você poderá encontrá-los neste espaço." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {jovens.map(jovem => {
              const patente = calcularPatente(jovem.xp);
              const cover = getProfileCover(jovem.perfilCapa);
              return (
                <Link
                  key={jovem.id}
                  to={ROUTES.PERFIL_USUARIO(jovem.id)}
                  aria-label={`Abrir perfil de ${jovem.nome}`}
                  className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                <Card
                  variant="actionable"
                  className={`profile-cover-card community-member-card relative flex min-h-32 flex-col items-center justify-center overflow-hidden p-4 text-center ${cover.imageUrl ? 'profile-cover-card--themed' : ''}`}
                >
                  <ProfileCoverBackground coverId={jovem.perfilCapa} preserveComposition />
                  <AvatarComEmblema nome={jovem.nome} fotoUrl={jovem.avatar} statusAnel={jovem.status_anel} xp={jovem.xp} brasaoInstitucional={jovem.brasaoInstitucional} />
                  <p className="profile-cover-card__name mt-3 line-clamp-2 max-w-full break-words text-sm font-semibold text-[var(--text-primary)]">{jovem.nome}</p>
                  <p className="profile-cover-card__secondary mt-0.5 text-xs text-[var(--text-muted)]">{patente.nome}</p>
                </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Link to="/ranking" className="flex min-h-14 items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)]">
        Ver jornada da comunidade
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
